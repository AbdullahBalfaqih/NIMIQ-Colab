import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  validateBody,
} from '../../common/validation';
import { formatErrorResponse, AppError } from '../../common/errors';
import { AuditService } from '../audit/audit.service';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService(fastify);
  const auditService = new AuditService();

  // ─── POST /api/auth/register ────────────────────────────────────────────────
  fastify.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(registerSchema, req.body);

      const user = await authService.register(body.email, body.password, body.displayName);

      await auditService.log({
        actorId: user.id,
        action: 'USER_REGISTERED',
        resource: 'users',
        resourceId: user.id,
        result: 'SUCCESS',
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return reply.code(201).send({
        user: { id: user.id, email: user.email, displayName: user.displayName },
      });
    },
  );

  // ─── POST /api/auth/login ───────────────────────────────────────────────────
  fastify.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(loginSchema, req.body);
      const tokens = await authService.login(body.email, body.password);

      return reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    },
  );

  // ─── POST /api/auth/refresh ─────────────────────────────────────────────────
  fastify.post(
    '/refresh',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(refreshSchema, req.body);
      const tokens = await authService.refreshTokens(body.refreshToken);

      return reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    },
  );

  // ─── POST /api/auth/logout ──────────────────────────────────────────────────
  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = req.body as { refreshToken?: string };
      if (body?.refreshToken) {
        await authService.revokeRefreshToken(body.refreshToken);
      }
      return reply.code(204).send();
    },
  );

  // ─── GET /api/auth/me ───────────────────────────────────────────────────────
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      // req.user is set by auth plugin — never from body
      return reply.send({ user: req.user });
    },
  );
}
