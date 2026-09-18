import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

async function securityPlugin(fastify: FastifyInstance): Promise<void> {
  // ── Helmet — Security Headers ────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://hub.nimiq.com',
          'https://hub.nimiq-testnet.com',
          'wss://rpc-testnet.nimiq.network',
          'wss://rpc.nimiq.network',
        ],
        frameSrc: [
          "'self'",
          'https://hub.nimiq.com',
          'https://hub.nimiq-testnet.com',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'sameorigin' }, // Mini App may need iframe
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // ── CORS — Strict Allowlist ──────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, mobile apps)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      // Never use wildcard for authenticated endpoints
      fastify.log.warn({ origin }, 'CORS blocked request from unauthorized origin');
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 600, // 10 minutes preflight cache
  });
}

export default fp(securityPlugin, { name: 'security-plugin' });
