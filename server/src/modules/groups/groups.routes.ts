import type { FastifyInstance, FastifyRequest } from 'fastify';
import { GroupsService } from './groups.service';
import { GoalsService } from '../goals/goals.service';
import { AuditService } from '../audit/audit.service';
import {
  createGroupSchema,
  addMemberSchema,
  paginationSchema,
  validateBody,
  validateQuery,
  uuidSchema,
} from '../../common/validation';
import { validateUUID } from '../../common/validation';

export async function groupsRoutes(fastify: FastifyInstance): Promise<void> {
  const groupsService = new GroupsService();
  const goalsService = new GoalsService();
  const auditService = new AuditService();

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── POST /api/groups ───────────────────────────────────────────────────────
  fastify.post('/', async (req: FastifyRequest, reply) => {
    const body = validateBody(createGroupSchema, req.body);
    const userId = req.user.id; // From JWT — never from body

    const group = await groupsService.createGroup(userId, body);

    await auditService.log({
      actorId: userId,
      action: 'GROUP_CREATED',
      resource: 'groups',
      resourceId: group.id,
      result: 'SUCCESS',
      requestId: req.id,
      ipAddress: req.ip,
      groupId: group.id,
    });

    return reply.code(201).send({ group });
  });

  // ─── GET /api/groups ────────────────────────────────────────────────────────
  fastify.get('/', async (req: FastifyRequest, reply) => {
    const query = validateQuery(paginationSchema, req.query);
    const userId = req.user.id;

    const result = await groupsService.listUserGroups(userId, query.page ?? 1, query.limit ?? 20);
    return reply.send(result);
  });

  // ─── GET /api/groups/:id ────────────────────────────────────────────────────
  fastify.get('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const groupId = validateUUID(req.params.id, 'group id');
    const userId = req.user.id;

    const group = await groupsService.getGroup(groupId, userId);
    return reply.send({ group });
  });

  // ─── GET /api/groups/:id/progress ──────────────────────────────────────────
  fastify.get('/:id/progress', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const groupId = validateUUID(req.params.id, 'group id');
    const userId = req.user.id;

    // Verify membership
    await groupsService.requireMembership(groupId, userId);

    const progress = await goalsService.getGroupProgress(groupId);
    return reply.send({ progress });
  });

  // ─── POST /api/groups/:id/members ───────────────────────────────────────────
  fastify.post(
    '/:id/members',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const groupId = validateUUID(req.params.id, 'group id');
      const body = validateBody(addMemberSchema, req.body);
      const userId = req.user.id;

      const member = await groupsService.addMember(
        groupId,
        userId,
        body.userId,
        body.role,
      );

      await auditService.log({
        actorId: userId,
        action: 'MEMBER_ADDED',
        resource: 'group_members',
        resourceId: member.id,
        result: 'SUCCESS',
        requestId: req.id,
        groupId,
        metadata: { addedUserId: body.userId, role: body.role },
      });

      return reply.code(201).send({ member });
    },
  );

  // ─── DELETE /api/groups/:id/members/:memberId ───────────────────────────────
  fastify.delete(
    '/:id/members/:memberId',
    async (
      req: FastifyRequest<{ Params: { id: string; memberId: string } }>,
      reply,
    ) => {
      const groupId = validateUUID(req.params.id, 'group id');
      const memberId = validateUUID(req.params.memberId, 'member id');
      const userId = req.user.id;

      await groupsService.removeMember(groupId, userId, memberId);

      await auditService.log({
        actorId: userId,
        action: 'MEMBER_REMOVED',
        resource: 'group_members',
        resourceId: memberId,
        result: 'SUCCESS',
        requestId: req.id,
        groupId,
      });

      return reply.code(204).send();
    },
  );
}
