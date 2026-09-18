import type { FastifyInstance, FastifyRequest } from 'fastify';
import { runAiAgent } from './ai.service';
import { PaymentService } from '../payments/payment.service';
import { GoalsService } from '../goals/goals.service';
import { AuditService } from '../audit/audit.service';
import prisma from '../../database/prisma';
import {
  aiChatSchema,
  confirmActionSchema,
  validateBody,
  validateUUID,
} from '../../common/validation';
import { NotFoundError, ForbiddenError, AppError } from '../../common/errors';
import { randomBytes } from 'crypto';

const paymentService = new PaymentService();
const goalsService = new GoalsService();
const auditService = new AuditService();

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── POST /api/ai/chat ────────────────────────────────────────────────────
  fastify.post(
    '/chat',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply) => {
      const body = validateBody(aiChatSchema, req.body);
      const userId = req.user.id;

      const response = await runAiAgent(
        userId,
        body.groupId,
        body.message,
        body.conversationId,
      );

      await auditService.log({
        actorId: userId,
        action: response.requiresConfirmation ? 'AI_ACTION_PROPOSED' : 'AI_ACTION_CONFIRMED',
        resource: 'ai_conversations',
        resourceId: response.conversationId,
        result: 'SUCCESS',
        requestId: req.id,
        groupId: body.groupId,
        metadata: {
          requiresConfirmation: response.requiresConfirmation,
          pendingActionId: response.pendingAction?.id,
        },
      });

      return reply.send(response);
    },
  );

  // ─── POST /api/ai/actions/:id/confirm ────────────────────────────────────
  fastify.post(
    '/actions/:id/confirm',
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      const actionId = validateUUID(req.params.id, 'action id');
      const body = validateBody(confirmActionSchema, req.body);
      const userId = req.user.id;

      // Load pending action — must belong to this user
      const action = await prisma.aiPendingAction.findFirst({
        where: { id: actionId, userId },
      });

      if (!action) {
        throw new NotFoundError('AI_ACTION_NOT_FOUND', 'Action not found');
      }

      // Check expiry
      if (action.expiresAt < new Date()) {
        await prisma.aiPendingAction.update({
          where: { id: actionId },
          data: { status: 'EXPIRED' },
        });
        throw new AppError('AI_ACTION_EXPIRED', 'This action has expired', 410);
      }

      // Check already processed
      if (action.status !== 'PENDING') {
        throw new AppError(
          'AI_ACTION_ALREADY_PROCESSED',
          `Action has already been ${action.status.toLowerCase()}`,
          409,
        );
      }

      if (!body.confirmed) {
        // User rejected the action
        await prisma.aiPendingAction.update({
          where: { id: actionId },
          data: { status: 'REJECTED', rejectedAt: new Date() },
        });

        await auditService.log({
          actorId: userId,
          action: 'AI_ACTION_REJECTED',
          resource: 'ai_pending_actions',
          resourceId: actionId,
          result: 'SUCCESS',
          requestId: req.id,
        });

        return reply.send({ confirmed: false, message: 'Action rejected' });
      }

      // ── Execute the confirmed action ──────────────────────────────────────
      const payload = action.payload as Record<string, unknown>;
      let result: unknown = null;

      switch (action.type) {
        case 'CREATE_PAYMENT_REQUEST': {
          const idempotencyKey = randomBytes(16).toString('hex');
          result = await paymentService.createPaymentRequest(
            userId,
            {
              groupId: payload.groupId as string,
              goalId: payload.goalId as string | undefined,
              recipientId: payload.recipientId as string,
              amount: payload.amount as string,
              currency: payload.currency as any,
              purpose: payload.purpose as string,
              note: payload.note as string | undefined,
              expiresInHours: 48,
            },
            idempotencyKey,
          );
          break;
        }

        case 'UPDATE_GOAL': {
          result = await goalsService.updateGoal(
            payload.goalId as string,
            userId,
            {
              deadline: payload.deadline as string | undefined,
              targetAmount: payload.targetAmount as string | undefined,
            },
          );
          break;
        }

        default:
          throw new AppError(
            'AI_ACTION_NOT_FOUND',
            `Unknown action type: ${action.type}`,
            400,
          );
      }

      // Mark action as confirmed
      await prisma.aiPendingAction.update({
        where: { id: actionId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });

      await auditService.log({
        actorId: userId,
        action: 'AI_ACTION_CONFIRMED',
        resource: 'ai_pending_actions',
        resourceId: actionId,
        result: 'SUCCESS',
        requestId: req.id,
        metadata: { type: action.type, payload },
      });

      return reply.send({
        confirmed: true,
        actionType: action.type,
        result,
      });
    },
  );
}
