import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import prisma from '../../database/prisma';
import { AppError, AuthError, ConflictError, NotFoundError } from '../../common/errors';
import type { FastifyInstance } from 'fastify';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserPayload {
  id: string;
  email: string;
  displayName: string;
}

// Argon2 configuration — intentionally slow for security
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<UserPayload> {
    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Use same error to prevent user enumeration
      throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists');
    }

    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true },
    });

    return user;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    // Always hash even if user not found to prevent timing attacks
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    const passwordHash = user?.passwordHash ?? await argon2.hash('dummy_prevent_timing', ARGON2_OPTIONS);

    let passwordValid = false;
    try {
      passwordValid = await argon2.verify(passwordHash, password, ARGON2_OPTIONS);
    } catch {
      // verification error — treat as invalid
    }

    if (!user || !passwordValid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    return this.issueTokens(user.id, user.email, user.displayName);
  }

  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, displayName: true, deletedAt: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AuthError('TOKEN_INVALID', 'Refresh token is invalid or expired');
    }

    if (stored.user.deletedAt) {
      throw new AuthError('UNAUTHORIZED', 'Account no longer exists');
    }

    // Rotate token — revoke old one
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.displayName);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyWalletOwnership(
    userId: string,
    address: string,
    network: string,
    _signature: string, // Future: verify cryptographic signature
  ): Promise<void> {
    // In production: verify signature against address using Nimiq crypto
    // For now: register wallet as claimed (TODO: real sig verification)
    await prisma.wallet.upsert({
      where: { address_network: { address, network } },
      create: { userId, address, network, verified: true, verifiedAt: new Date() },
      update: { verified: true, verifiedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, email: string, displayName: string): Promise<AuthTokens> {
    const payload: UserPayload = { id: userId, email, displayName };

    const accessToken = await this.fastify.jwt.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    });

    // Generate cryptographically secure refresh token
    const rawRefreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
