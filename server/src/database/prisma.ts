import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `prisma` in development to prevent multiple instances
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global._prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV === 'development') {
  global._prisma = prisma;
}

export default prisma;

/**
 * Gracefully disconnect Prisma on process exit.
 * Call this in your shutdown handler.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
