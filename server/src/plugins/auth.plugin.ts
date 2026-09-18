import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { AuthError } from '../common/errors';
import type { UserPayload } from '../modules/auth/auth.service';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: UserPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // Register JWT plugin — uses env variables for keys
  await fastify.register(fastifyJwt, {
    secret: {
      private: process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      public: process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n'),
    },
    sign: {
      algorithm: 'RS256',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    },
    verify: {
      algorithms: ['RS256'],
    },
  });

  // Mandatory auth decorator — attach to routes that require auth
  fastify.decorate(
    'authenticate',
    async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
        // req.user is now set from JWT payload
        // NEVER trust user_id from request body — always use req.user
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Token verification failed';
        if (message.includes('expired')) {
          throw new AuthError('TOKEN_EXPIRED', 'Access token has expired');
        }
        throw new AuthError('TOKEN_INVALID', 'Invalid or missing access token');
      }
    },
  );

  // Optional auth — sets req.user if token present, but doesn't fail
  fastify.decorate(
    'authenticateOptional',
    async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      try {
        if (req.headers.authorization) {
          await req.jwtVerify();
        }
      } catch {
        // Intentionally swallow — optional auth
      }
    },
  );
}

export default fp(authPlugin, { name: 'auth-plugin' });
