import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'crypto';

// Global BigInt JSON serialization support for Prisma BigInt fields
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import authPlugin from './plugins/auth.plugin';
import securityPlugin from './plugins/security.plugin';
import { AppError, formatErrorResponse, InternalError } from './common/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { groupsRoutes } from './modules/groups/groups.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { AuditService } from './modules/audit/audit.service';
import prisma, { disconnectDatabase } from './database/prisma';

const auditService = new AuditService();

// ─── Validate required env ────────────────────────────────────────────────────
function validateEnvironment(): void {
  const required: string[] = [
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
    missing.push('OPENROUTER_API_KEY or GEMINI_API_KEY');
  }

  if (missing.length > 0) {
    console.error(`[STARTUP] Missing required environment variables: ${missing.join(', ')}`);
    // Don't log the values themselves
    process.exit(1);
  }
}

// ─── Build App ────────────────────────────────────────────────────────────────
async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      ...(process.env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : {}),
    },
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    // Limits
    bodyLimit: 64 * 1024, // 64 KB max body
    maxParamLength: 100,
  });

  // ── Plugins ────────────────────────────────────────────────────────────────
  await fastify.register(securityPlugin);
  await fastify.register(authPlugin);

  await fastify.register(rateLimit, {
    global: true,
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX ?? '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS ?? '60000', 10),
    keyGenerator: (req) => {
      // Rate limit by authenticated user if available, otherwise by IP
      const user = (req as any).user;
      return user ? `user:${user.id}` : `ip:${req.ip}`;
    },
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Retry after ${context.after}`,
        requestId: (_req as any).id,
      },
    }),
  });

  // ── Error Handler ──────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, req, reply) => {
    const requestId = req.id ?? 'unknown';

    if (error instanceof AppError) {
      // Log at appropriate level
      if (error.statusCode >= 500) {
        fastify.log.error({ err: error, requestId }, 'Application error');
      } else {
        fastify.log.warn({ code: error.code, requestId }, error.message);
      }
      return reply
        .code(error.statusCode)
        .send(formatErrorResponse(error, requestId));
    }

    // Zod validation errors from Fastify
    if ((error as any).validation) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          requestId,
        },
      });
    }

    // Unknown errors — never expose internals
    fastify.log.error({ err: error, requestId }, 'Unhandled error');
    const internal = new InternalError();
    return reply.code(500).send(formatErrorResponse(internal, requestId));
  });

  // ── Routes ──────────────────────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(groupsRoutes, { prefix: '/api/groups' });
  await fastify.register(paymentRoutes, { prefix: '/api/payments' });
  await fastify.register(aiRoutes, { prefix: '/api/ai' });

  // ── Health & Readiness ─────────────────────────────────────────────────────
  fastify.get('/health', async (_req, reply) => {
    // Never expose DB info in health endpoint
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get('/ready', async (_req, reply) => {
    try {
      // Light DB ping — no sensitive data returned
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      return reply.code(503).send({ status: 'not_ready' });
    }
  });

  // Audit routes
  fastify.get(
    '/api/audit/groups/:groupId',
    { preHandler: [fastify.authenticate] },
    async (req: any, reply) => {
      const { groupId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const logs = await auditService.getGroupAuditLogs(groupId, page, limit);
      return reply.send(logs);
    },
  );

  return fastify;
}

// ─── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  if (process.env.NODE_ENV !== 'test') {
    validateEnvironment();
  }

  const fastify = await buildApp();
  const port = parseInt(process.env.PORT ?? '3000', 10);

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server started on port ${port}`);
  } catch (err) {
    fastify.log.error(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, shutting down gracefully`);
    await fastify.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return fastify;
}

export { buildApp };

if (require.main === module) {
  start().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
