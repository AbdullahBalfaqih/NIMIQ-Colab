import { randomBytes } from 'crypto';
import prisma from '../../database/prisma';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  PaymentError,
} from '../../common/errors';
import { parseAmountToBaseUnits, formatBaseUnits } from '../../services/money/money.service';
import { transition, isTerminalState } from './payment-state-machine';
import { GroupsService } from '../groups/groups.service';
import { AnomalyService } from '../anomaly/anomaly.service';
import { AuditService } from '../audit/audit.service';
import type { SupportedCurrency } from '../../common/validation';

const groupsService = new GroupsService();
const anomalyService = new AnomalyService();
const auditService = new AuditService();

export class PaymentService {

  /**
   * Create a payment request.
   * Idempotent — same idempotency key returns same result.
   */
  async createPaymentRequest(
    requesterId: string,
    data: {
      groupId: string;
      goalId?: string;
      recipientId: string;
      amount: string;
      currency: SupportedCurrency;
      purpose: string;
      note?: string;
      expiresInHours: number;
    },
    idempotencyKey: string,
  ) {
    // Check idempotency
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });
    if (existing) {
      return existing.responseBody;
    }

    // Verify requester is in group
    await groupsService.requireMembership(data.groupId, requesterId);

    // Verify recipient is in group
    await groupsService.requireMembership(data.groupId, data.recipientId);

    if (requesterId === data.recipientId) {
      throw new PaymentError(
        'PAYMENT_INVALID_STATE',
        'Cannot create a payment request to yourself',
      );
    }

    const amountCents = parseAmountToBaseUnits(data.amount, data.currency);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + data.expiresInHours);

    const requestUniqueKey = randomBytes(16).toString('hex');

    const paymentRequest = await prisma.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.create({
        data: {
          groupId: data.groupId,
          goalId: data.goalId,
          requesterId,
          recipientId: data.recipientId,
          amountCents,
          currency: data.currency,
          purpose: data.purpose,
          note: data.note,
          expiresAt,
          idempotencyKey: requestUniqueKey,
        },
        include: {
          requester: { select: { id: true, displayName: true } },
          recipient: { select: { id: true, displayName: true } },
        },
      });

      // Store idempotency key
      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId: requesterId,
          endpoint: '/api/payment-requests',
          responseCode: 201,
          responseBody: { id: pr.id },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return pr;
    });

    await auditService.log({
      actorId: requesterId,
      action: 'PAYMENT_REQUEST_CREATED',
      resource: 'payment_requests',
      resourceId: paymentRequest.id,
      result: 'SUCCESS',
      groupId: data.groupId,
      metadata: {
        recipientId: data.recipientId,
        amountCents: amountCents.toString(),
        currency: data.currency,
      },
    });

    return {
      id: paymentRequest.id,
      groupId: data.groupId,
      recipientId: data.recipientId,
      amount: formatBaseUnits(amountCents, data.currency),
      currency: data.currency,
      purpose: data.purpose,
      status: paymentRequest.status,
      expiresAt,
    };
  }

  /**
   * Get a payment request — verify group membership.
   */
  async getPaymentRequest(requestId: string, requestingUserId: string) {
    const pr = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: {
        group: {
          include: {
            members: { where: { userId: requestingUserId, leftAt: null } },
          },
        },
        requester: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    if (!pr) throw new NotFoundError('PAYMENT_REQUEST_NOT_FOUND', 'Payment request not found');
    if (pr.group.members.length === 0) {
      throw new ForbiddenError('Access denied to this payment request');
    }

    // Auto-expire if past expiry
    if (pr.expiresAt < new Date() && pr.status === 'PENDING') {
      await prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      pr.status = 'EXPIRED';
    }

    const currency = pr.currency as SupportedCurrency;
    return {
      ...pr,
      amountFormatted: formatBaseUnits(pr.amountCents, currency),
      amountCents: pr.amountCents.toString(), // BigInt to string for JSON
    };
  }

  /**
   * Prepare a payment intent for a payment request.
   * Creates a locked intent that binds amount + recipient + sender.
   * Idempotent via idempotency key header.
   */
  async preparePaymentIntent(
    requestId: string,
    requestingUserId: string,
    senderAddress: string,
    idempotencyKey: string,
  ) {
    // Check idempotency
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });
    if (existing) {
      return existing.responseBody;
    }

    const pr = await this.getPaymentRequest(requestId, requestingUserId);

    // Only recipient can initiate payment
    if (pr.recipientId !== requestingUserId) {
      throw new ForbiddenError('Only the payment recipient can initiate this payment');
    }

    // Check request status
    if (pr.status !== 'PENDING' && pr.status !== 'OPENED') {
      throw new PaymentError(
        'PAYMENT_INVALID_STATE',
        `Payment request is in status ${pr.status} and cannot be paid`,
      );
    }

    if (pr.expiresAt < new Date()) {
      throw new PaymentError('PAYMENT_EXPIRED', 'Payment request has expired');
    }

    // Get recipient wallet address
    const recipientWallet = await prisma.wallet.findFirst({
      where: { userId: pr.requesterId, network: process.env.NIMIQ_NETWORK ?? 'testnet' },
    });

    if (!recipientWallet) {
      throw new PaymentError(
        'PAYMENT_INVALID_STATE',
        'Payment requester has no registered wallet address',
      );
    }

    const intentExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    const intentIdempotencyKey = randomBytes(16).toString('hex');

    const intent = await prisma.$transaction(async (tx) => {
      const newIntent = await tx.paymentIntent.create({
        data: {
          paymentRequestId: requestId,
          amountCents: pr.amountCents as unknown as bigint, // Already in base units
          currency: pr.currency,
          recipientAddress: recipientWallet.address,
          senderAddress,
          status: 'AWAITING_USER_CONFIRMATION',
          idempotencyKey: intentIdempotencyKey,
          expiresAt: intentExpiresAt,
        },
      });

      // Update payment request status
      await tx.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'OPENED' },
      });

      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId: requestingUserId,
          endpoint: '/api/payments/prepare',
          responseCode: 200,
          responseBody: { intentId: newIntent.id },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return newIntent;
    });

    await auditService.log({
      actorId: requestingUserId,
      action: 'PAYMENT_INTENT_CREATED',
      resource: 'payment_intents',
      resourceId: intent.id,
      result: 'SUCCESS',
      metadata: {
        paymentRequestId: requestId,
        amountCents: intent.amountCents.toString(),
        recipientAddress: intent.recipientAddress,
      },
    });

    const currency = pr.currency as SupportedCurrency;
    return {
      intentId: intent.id,
      amountCents: intent.amountCents.toString(),
      amountFormatted: formatBaseUnits(intent.amountCents, currency),
      currency: intent.currency,
      recipientAddress: intent.recipientAddress,
      senderAddress: intent.senderAddress,
      expiresAt: intent.expiresAt,
      // Nimiq Pay parameters for the frontend
      nimiqPayUrl: this.buildNimiqPayUrl(
        intent.recipientAddress,
        intent.amountCents,
        intent.currency,
        intent.id,
      ),
    };
  }

  /**
   * Build Nimiq Pay deep link URL for the frontend.
   */
  private buildNimiqPayUrl(
    recipient: string,
    amountCents: bigint,
    currency: string,
    intentId: string,
  ): string {
    const network = process.env.NIMIQ_NETWORK ?? 'testnet';
    const baseUrl = network === 'mainnet'
      ? 'https://hub.nimiq.com'
      : 'https://hub.nimiq-testnet.com';

    // Nimiq Hub payment params
    const params = new URLSearchParams({
      recipient,
      amount: amountCents.toString(),
      currency,
      message: `NIMIQ-${intentId.slice(0, 8)}`,
      network,
    });

    return `${baseUrl}/request-payment?${params.toString()}`;
  }

  /**
   * Cancel a payment request (OWNER/ADMIN only, or requester).
   */
  async cancelPaymentRequest(requestId: string, requestingUserId: string) {
    const pr = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });
    if (!pr) throw new NotFoundError('PAYMENT_REQUEST_NOT_FOUND', 'Payment request not found');

    const member = await groupsService.requireMembership(pr.groupId, requestingUserId);

    const canCancel =
      pr.requesterId === requestingUserId ||
      member.role === 'OWNER' ||
      member.role === 'ADMIN';

    if (!canCancel) {
      throw new ForbiddenError('Insufficient permissions to cancel this request');
    }

    if (['PAID', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(pr.status)) {
      throw new PaymentError(
        'PAYMENT_INVALID_STATE',
        `Cannot cancel a request in status: ${pr.status}`,
      );
    }

    return prisma.paymentRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * List payment requests for a group — paginated.
   */
  async listGroupPaymentRequests(
    groupId: string,
    requestingUserId: string,
    page: number,
    limit: number,
  ) {
    await groupsService.requireMembership(groupId, requestingUserId);

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where: { groupId },
        include: {
          requester: { select: { id: true, displayName: true } },
          recipient: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentRequest.count({ where: { groupId } }),
    ]);

    return {
      requests: requests.map(r => ({
        ...r,
        amountCents: r.amountCents.toString(),
      })),
      total,
      page,
      limit,
    };
  }
}
