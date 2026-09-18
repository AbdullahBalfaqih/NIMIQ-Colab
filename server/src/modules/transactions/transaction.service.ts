import prisma from '../../database/prisma';
import { getNimiqProvider } from '../../services/nimiq/nimiq.provider';
import { AnomalyService } from '../anomaly/anomaly.service';
import { AuditService } from '../audit/audit.service';
import { GroupsService } from '../groups/groups.service';
import { transition } from '../payments/payment-state-machine';
import {
  PaymentError,
  NotFoundError,
  ForbiddenError,
} from '../../common/errors';
import { formatBaseUnits } from '../../services/money/money.service';
import type { SupportedCurrency } from '../../common/validation';
import { NotificationService } from '../notifications/notification.service';

const anomalyService = new AnomalyService();
const auditService = new AuditService();
const groupsService = new GroupsService();
const notificationService = new NotificationService();

export class TransactionService {

  /**
   * Verify a Nimiq payment and atomically update all related records.
   *
   * This is the core financial operation. It MUST be atomic.
   * If anything fails, the entire operation rolls back.
   *
   * Steps:
   * 1. Lock payment intent row
   * 2. Validate intent state
   * 3. Query Nimiq blockchain (independent of frontend)
   * 4. Run anomaly checks (cannot be bypassed by AI)
   * 5. BEGIN TRANSACTION
   *    a. Insert transaction record
   *    b. Update payment intent → CONFIRMED
   *    c. Update payment request → PAID
   *    d. Create contribution record
   *    e. Write audit log
   * 6. COMMIT
   * 7. Send notifications
   */
  async verifyAndConfirmPayment(
    intentId: string,
    submittedTxHash: string,
    requestingUserId: string,
    requestId?: string,
  ) {
    // ── Phase 1: Load and validate intent ─────────────────────────────────────
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: {
        paymentRequest: {
          include: {
            group: true,
            goal: true,
            requester: { select: { id: true, displayName: true } },
            recipient: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!intent) {
      throw new NotFoundError('PAYMENT_INTENT_NOT_FOUND', 'Payment intent not found');
    }

    // Verify requester is the payment recipient
    if (intent.paymentRequest.recipientId !== requestingUserId) {
      throw new ForbiddenError('Only the payment payer can submit verification');
    }

    // Validate current state
    try {
      transition(intent.status, 'VERIFYING', 'payment verification');
    } catch (err) {
      await auditService.log({
        actorId: requestingUserId,
        action: 'PAYMENT_REJECTED',
        resource: 'payment_intents',
        resourceId: intentId,
        result: 'FAILURE',
        requestId,
        metadata: { reason: 'Invalid state transition', currentStatus: intent.status },
      });
      throw err;
    }

    // ── Phase 2: Update to VERIFYING first ────────────────────────────────────
    await prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: 'VERIFYING', nimiqTxHash: submittedTxHash },
    });

    // ── Phase 3: Query blockchain independently ───────────────────────────────
    await auditService.log({
      actorId: requestingUserId,
      action: 'PAYMENT_VERIFYING',
      resource: 'payment_intents',
      resourceId: intentId,
      result: 'SUCCESS',
      requestId,
      metadata: { txHash: submittedTxHash },
    });

    const nimiqProvider = getNimiqProvider();
    const network = process.env.NIMIQ_NETWORK ?? 'testnet';
    const blockchainResult = await nimiqProvider.verifyTransaction(submittedTxHash, network);

    if (!blockchainResult.valid) {
      await prisma.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: 'FAILED',
          failureReason: blockchainResult.failureReason ?? 'Blockchain verification failed',
        },
      });

      await auditService.log({
        actorId: requestingUserId,
        action: 'PAYMENT_REJECTED',
        resource: 'payment_intents',
        resourceId: intentId,
        result: 'FAILURE',
        requestId,
        metadata: {
          reason: 'Blockchain verification failed',
          failureReason: blockchainResult.failureReason,
        },
      });

      throw new PaymentError(
        'PAYMENT_VERIFICATION_FAILED',
        'Unable to verify payment on the blockchain',
      );
    }

    // ── Phase 4: Anomaly checks — CANNOT be bypassed ─────────────────────────
    const anomalyResult = await anomalyService.checkPaymentVerification({
      intentId,
      submittedTxHash,
      blockchainAmountBaseUnits: blockchainResult.amountBaseUnits,
      blockchainRecipientAddress: blockchainResult.recipientAddress,
      blockchainCurrency: blockchainResult.currency,
      blockchainConfirmations: blockchainResult.confirmations,
      actorId: requestingUserId,
      requestId,
    });

    if (!anomalyResult.passed) {
      const criticalFindings = anomalyResult.findings.filter(f => f.severity === 'CRITICAL');

      await prisma.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: 'REJECTED',
          failureReason: criticalFindings[0]?.description ?? 'Anomaly detected',
        },
      });

      throw new PaymentError(
        criticalFindings[0]?.type === 'DUPLICATE_TRANSACTION'
          ? 'PAYMENT_DUPLICATE_TRANSACTION'
          : criticalFindings[0]?.type === 'AMOUNT_MISMATCH'
          ? 'PAYMENT_AMOUNT_MISMATCH'
          : criticalFindings[0]?.type === 'RECIPIENT_MISMATCH'
          ? 'PAYMENT_RECIPIENT_MISMATCH'
          : criticalFindings[0]?.type === 'REPLAY_ATTACK'
          ? 'PAYMENT_REPLAY_DETECTED'
          : 'PAYMENT_VERIFICATION_FAILED',
        criticalFindings[0]?.description ?? 'Payment verification failed due to anomaly',
      );
    }

    // ── Phase 5: Atomic DB transaction ────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 5a. Insert blockchain transaction record
      // UNIQUE constraint on nimiqTxHash prevents double-counting
      const transaction = await tx.transaction.create({
        data: {
          paymentIntentId: intentId,
          nimiqTxHash: submittedTxHash,
          amountCents: blockchainResult.amountBaseUnits,
          currency: blockchainResult.currency,
          senderAddress: blockchainResult.senderAddress,
          recipientAddress: blockchainResult.recipientAddress,
          blockHeight: blockchainResult.blockHeight,
          confirmations: blockchainResult.confirmations,
          network,
          confirmedAt: blockchainResult.timestamp ?? new Date(),
          rawData: blockchainResult.rawData as object,
        },
      });

      // 5b. Update payment intent → CONFIRMED
      await tx.paymentIntent.update({
        where: { id: intentId },
        data: { status: 'CONFIRMED', completedAt: new Date() },
      });

      // 5c. Update payment request → PAID
      await tx.paymentRequest.update({
        where: { id: intent.paymentRequestId },
        data: { status: 'PAID' },
      });

      // 5d. Find group member for recipient
      const groupMember = await tx.groupMember.findFirst({
        where: {
          groupId: intent.paymentRequest.groupId,
          userId: requestingUserId,
          leftAt: null,
        },
      });

      // 5e. Create contribution record if tied to a goal
      if (intent.paymentRequest.goalId && groupMember) {
        await tx.contribution.create({
          data: {
            goalId: intent.paymentRequest.goalId,
            groupMemberId: groupMember.id,
            transactionId: transaction.id,
            amountCents: blockchainResult.amountBaseUnits,
            note: intent.paymentRequest.purpose,
          },
        });
      }

      return { transaction, groupMember };
    });

    // ── Phase 6: Post-confirmation audit & notifications ──────────────────────
    await auditService.log({
      actorId: requestingUserId,
      action: 'PAYMENT_VERIFIED',
      resource: 'transactions',
      resourceId: result.transaction.id,
      result: 'SUCCESS',
      requestId,
      groupId: intent.paymentRequest.groupId,
      metadata: {
        txHash: submittedTxHash,
        amountCents: result.transaction.amountCents.toString(),
        currency: result.transaction.currency,
        paymentRequestId: intent.paymentRequestId,
      },
    });

    // ── Phase 7: Notifications ────────────────────────────────────────────────
    const currency = intent.currency as SupportedCurrency;
    await notificationService.emit({
      type: 'PAYMENT_RECEIVED',
      groupId: intent.paymentRequest.groupId,
      recipientUserId: intent.paymentRequest.requesterId,
      title: 'Payment Received! 💰',
      body: `${intent.paymentRequest.recipient.displayName} paid ${formatBaseUnits(blockchainResult.amountBaseUnits, currency)} ${currency}`,
      metadata: {
        transactionId: result.transaction.id,
        amount: blockchainResult.amountBaseUnits.toString(),
        txHash: submittedTxHash,
      },
    });

    return {
      success: true,
      transactionId: result.transaction.id,
      txHash: submittedTxHash,
      amountCents: blockchainResult.amountBaseUnits.toString(),
      amountFormatted: formatBaseUnits(blockchainResult.amountBaseUnits, currency),
      currency: result.transaction.currency,
      confirmations: blockchainResult.confirmations,
      confirmedAt: result.transaction.confirmedAt,
    };
  }

  /**
   * Get transaction list for a group — paginated.
   */
  async getGroupTransactions(
    groupId: string,
    requestingUserId: string,
    page: number,
    limit: number,
  ) {
    await groupsService.requireMembership(groupId, requestingUserId);

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          paymentIntent: {
            paymentRequest: { groupId },
          },
        },
        include: {
          paymentIntent: {
            include: {
              paymentRequest: {
                include: {
                  requester: { select: { id: true, displayName: true } },
                  recipient: { select: { id: true, displayName: true } },
                },
              },
            },
          },
        },
        orderBy: { confirmedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { paymentIntent: { paymentRequest: { groupId } } },
      }),
    ]);

    return {
      transactions: transactions.map(t => ({
        ...t,
        amountCents: t.amountCents.toString(),
      })),
      total,
      page,
      limit,
    };
  }
}
