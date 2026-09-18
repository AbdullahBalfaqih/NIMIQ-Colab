import type { FastifyInstance, FastifyRequest } from 'fastify';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transactions/transaction.service';
import { AuditService } from '../audit/audit.service';
import {
  createPaymentRequestSchema,
  preparePaymentSchema,
  verifyPaymentSchema,
  paginationSchema,
  validateBody,
  validateQuery,
  validateUUID,
} from '../../common/validation';
import { ValidationError } from '../../common/errors';

const paymentService = new PaymentService();
const transactionService = new TransactionService();
const auditService = new AuditService();

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── POST /api/payment-requests ───────────────────────────────────────────
  fastify.post(
    '/requests',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply) => {
      const body = validateBody(createPaymentRequestSchema, req.body);
      const userId = req.user.id;

      // Idempotency key from header
      const idempotencyKey = req.headers['idempotency-key'] as string;
      if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 255) {
        throw new ValidationError('Idempotency-Key header is required (8-255 chars)');
      }

      const result = await paymentService.createPaymentRequest(
        userId,
        { ...body, expiresInHours: body.expiresInHours ?? 48 },
        idempotencyKey,
      );

      return reply.code(201).send({ paymentRequest: result });
    },
  );

  // ─── GET /api/payment-requests/:id ───────────────────────────────────────
  fastify.get(
    '/requests/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const requestId = validateUUID(req.params.id, 'payment request id');
      const userId = req.user.id;

      const pr = await paymentService.getPaymentRequest(requestId, userId);
      return reply.send({ paymentRequest: pr });
    },
  );

  // ─── DELETE /api/payment-requests/:id (cancel) ───────────────────────────
  fastify.delete(
    '/requests/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const requestId = validateUUID(req.params.id, 'payment request id');
      const userId = req.user.id;

      await paymentService.cancelPaymentRequest(requestId, userId);

      await auditService.log({
        actorId: userId,
        action: 'PAYMENT_REQUEST_CANCELLED',
        resource: 'payment_requests',
        resourceId: requestId,
        result: 'SUCCESS',
        requestId: req.id,
      });

      return reply.code(204).send();
    },
  );

  // ─── POST /api/payments/prepare ───────────────────────────────────────────
  fastify.post(
    '/prepare',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply) => {
      const body = validateBody(preparePaymentSchema, req.body);
      const userId = req.user.id;

      const idempotencyKey = req.headers['idempotency-key'] as string;
      if (!idempotencyKey || idempotencyKey.length < 8) {
        throw new ValidationError('Idempotency-Key header is required');
      }

      const intent = await paymentService.preparePaymentIntent(
        body.paymentRequestId,
        userId,
        body.senderAddress,
        idempotencyKey,
      );

      return reply.send({ intent });
    },
  );

  // ─── POST /api/payments/verify ────────────────────────────────────────────
  fastify.post(
    '/verify',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply) => {
      const body = validateBody(verifyPaymentSchema, req.body);
      const userId = req.user.id;

      const result = await transactionService.verifyAndConfirmPayment(
        body.paymentIntentId,
        body.nimiqTxHash,
        userId,
        req.id,
      );

      return reply.send({ verification: result });
    },
  );

  // ─── GET /api/groups/:id/transactions ─────────────────────────────────────
  fastify.get(
    '/groups/:groupId/transactions',
    async (req: FastifyRequest<{ Params: { groupId: string } }>, reply) => {
      const groupId = validateUUID(req.params.groupId, 'group id');
      const query = validateQuery(paginationSchema, req.query);
      const userId = req.user.id;

      const result = await transactionService.getGroupTransactions(
        groupId,
        userId,
        query.page ?? 1,
        query.limit ?? 20,
      );

      return reply.send(result);
    },
  );
}
