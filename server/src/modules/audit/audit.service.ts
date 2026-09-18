import prisma from '../../database/prisma';
import type { AuditAction } from '@prisma/client';

export interface AuditLogEntry {
  actorId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  groupId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Create an immutable audit log entry.
   * Append-only — never updates or deletes audit records.
   *
   * IMPORTANT: Never log secrets, tokens, passwords, private keys.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize metadata — remove any sensitive fields
      const safeMetadata = entry.metadata
        ? this.sanitizeMetadata(entry.metadata)
        : undefined;

      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          result: entry.result,
          requestId: entry.requestId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent?.slice(0, 500), // Truncate
          groupId: entry.groupId,
          metadata: safeMetadata as any,
        },
      });
    } catch (err) {
      // Audit logging must never crash the application
      // Log to stderr but don't propagate
      console.error('[AUDIT] Failed to write audit log:', err);
    }
  }

  /**
   * Query audit logs for a group — paginated, newest first.
   */
  async getGroupAuditLogs(
    groupId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { groupId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          actorId: true,
          action: true,
          resource: true,
          resourceId: true,
          result: true,
          requestId: true,
          metadata: true,
          timestamp: true,
          actor: { select: { displayName: true } },
        },
      }),
      prisma.auditLog.count({ where: { groupId } }),
    ]);

    return { logs, total, page, limit };
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const SENSITIVE_KEYS = [
      'password', 'passwordHash', 'token', 'secret', 'privateKey',
      'seedPhrase', 'mnemonic', 'apiKey', 'authorization',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const isSensitive = SENSITIVE_KEYS.some(k =>
        key.toLowerCase().includes(k.toLowerCase()),
      );
      sanitized[key] = isSensitive ? '[REDACTED]' : value;
    }
    return sanitized;
  }
}
