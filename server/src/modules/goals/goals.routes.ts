import type { FastifyInstance, FastifyRequest } from 'fastify';
import { GoalsService } from './goals.service';
import { GroupsService } from '../groups/groups.service';
import { AuditService } from '../audit/audit.service';
import {
  createGoalSchema,
  updateGoalSchema,
  paginationSchema,
  validateBody,
  validateQuery,
  validateUUID,
} from '../../common/validation';

export async function goalsRoutes(fastify: FastifyInstance): Promise<void> {
  const goalsService = new GoalsService();
  const groupsService = new GroupsService();
  const auditService = new AuditService();

  fastify.addHook('preHandler', fastify.authenticate);

  // ─── POST /api/groups/:groupId/goals ─────────────────────────────────────
  fastify.post(
    '/groups/:groupId/goals',
    async (req: FastifyRequest<{ Params: { groupId: string } }>, reply) => {
      const groupId = validateUUID(req.params.groupId, 'group id');
      const body = validateBody(createGoalSchema, req.body);
      const userId = req.user.id;

      // Only OWNER or ADMIN can create goals
      await groupsService.requireRole(groupId, userId, ['OWNER', 'ADMIN']);

      const goal = await goalsService.createGoal(groupId, userId, body);

      await auditService.log({
        actorId: userId,
        action: 'GOAL_CREATED',
        resource: 'goals',
        resourceId: goal.id,
        result: 'SUCCESS',
        requestId: req.id,
        groupId,
        metadata: {
          name: goal.name,
          targetAmount: goal.targetAmount.toString(),
          currency: goal.currency,
        },
      });

      return reply.code(201).send({ goal });
    },
  );

  // ─── GET /api/groups/:groupId/goals/:id ──────────────────────────────────
  fastify.get(
    '/groups/:groupId/goals/:id',
    async (
      req: FastifyRequest<{ Params: { groupId: string; id: string } }>,
      reply,
    ) => {
      const groupId = validateUUID(req.params.groupId, 'group id');
      const goalId = validateUUID(req.params.id, 'goal id');
      const userId = req.user.id;

      // Verify membership before fetching goal
      await groupsService.requireMembership(groupId, userId);

      const goal = await goalsService.getGoal(goalId, userId);
      return reply.send({ goal });
    },
  );

  // ─── PATCH /api/groups/:groupId/goals/:id ────────────────────────────────
  fastify.patch(
    '/groups/:groupId/goals/:id',
    async (
      req: FastifyRequest<{ Params: { groupId: string; id: string } }>,
      reply,
    ) => {
      const groupId = validateUUID(req.params.groupId, 'group id');
      const goalId = validateUUID(req.params.id, 'goal id');
      const body = validateBody(updateGoalSchema, req.body);
      const userId = req.user.id;

      // Only OWNER or ADMIN can update goals
      await groupsService.requireRole(groupId, userId, ['OWNER', 'ADMIN']);

      const goal = await goalsService.updateGoal(goalId, userId, body);

      await auditService.log({
        actorId: userId,
        action: 'GOAL_UPDATED',
        resource: 'goals',
        resourceId: goal.id,
        result: 'SUCCESS',
        requestId: req.id,
        groupId,
        metadata: { changes: Object.keys(body) },
      });

      return reply.send({ goal });
    },
  );
}
