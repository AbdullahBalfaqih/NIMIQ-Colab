import prisma from '../../database/prisma';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../common/errors';
import type { GroupMemberRole } from '@prisma/client';

export interface GroupSummary {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  currency: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

export class GroupsService {

  /**
   * Create a new group. Creator automatically becomes OWNER.
   * NEVER accept ownerId from client — derive from authenticated user.
   */
  async createGroup(
    userId: string,
    data: { name: string; emoji: string; description?: string; currency: string },
  ): Promise<GroupSummary> {
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: data.name,
          emoji: data.emoji,
          description: data.description,
          currency: data.currency,
          ownerId: userId,
        },
      });

      // Add creator as OWNER member
      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId,
          role: 'OWNER',
        },
      });

      return newGroup;
    });

    return {
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      description: group.description,
      currency: group.currency,
      ownerId: group.ownerId,
      memberCount: 1,
      createdAt: group.createdAt,
    };
  }

  /**
   * Get a group — ONLY if the requesting user is a member.
   * Prevents IDOR / BOLA.
   */
  async getGroup(groupId: string, requestingUserId: string) {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
        members: { some: { userId: requestingUserId, leftAt: null } },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
        goals: {
          where: { status: 'ACTIVE' },
          include: {
            contributions: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('GROUP_NOT_FOUND', 'Group not found');
    }

    return group;
  }

  /**
   * List all groups the authenticated user belongs to.
   */
  async listUserGroups(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: {
          deletedAt: null,
          members: { some: { userId, leftAt: null } },
        },
        include: {
          _count: { select: { members: true } },
          goals: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              name: true,
              targetAmount: true,
              currency: true,
              deadline: true,
              contributions: {
                select: { amountCents: true },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.group.count({
        where: { deletedAt: null, members: { some: { userId, leftAt: null } } },
      }),
    ]);

    return { groups, total, page, limit };
  }

  /**
   * Add a member to a group.
   * Requires OWNER or ADMIN role.
   */
  async addMember(
    groupId: string,
    requestingUserId: string,
    targetUserId: string,
    role: GroupMemberRole = 'MEMBER',
  ) {
    await this.requireRole(groupId, requestingUserId, ['OWNER', 'ADMIN']);

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
    });
    if (!targetUser) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }

    // Check not already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, leftAt: null },
    });
    if (existing) {
      throw new ConflictError('ALREADY_MEMBER', 'User is already a member of this group');
    }

    // OWNER cannot be assigned via addMember — only one owner allowed
    if (role === 'OWNER') {
      throw new ValidationError('Cannot assign OWNER role via addMember');
    }

    return prisma.groupMember.create({
      data: { groupId, userId: targetUserId, role },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  /**
   * Remove a member from a group.
   * OWNER can remove anyone. ADMIN can remove MEMBERs only.
   * Users can remove themselves (leave group).
   */
  async removeMember(
    groupId: string,
    requestingUserId: string,
    targetMemberId: string,
  ) {
    const [requesterMember, targetMember] = await Promise.all([
      prisma.groupMember.findFirst({
        where: { groupId, userId: requestingUserId, leftAt: null },
      }),
      prisma.groupMember.findFirst({
        where: { id: targetMemberId, groupId, leftAt: null },
      }),
    ]);

    if (!requesterMember) {
      throw new ForbiddenError('You are not a member of this group');
    }
    if (!targetMember) {
      throw new NotFoundError('NOT_FOUND', 'Member not found');
    }

    const isSelf = targetMember.userId === requestingUserId;
    const isOwner = requesterMember.role === 'OWNER';
    const isAdmin = requesterMember.role === 'ADMIN';
    const targetIsOwner = targetMember.role === 'OWNER';

    if (targetIsOwner && !isSelf) {
      throw new ForbiddenError('Cannot remove the group owner');
    }
    if (!isSelf && !isOwner && !isAdmin) {
      throw new ForbiddenError('Insufficient permissions to remove this member');
    }
    if (isAdmin && targetMember.role === 'ADMIN' && !isSelf) {
      throw new ForbiddenError('Admins cannot remove other admins');
    }

    return prisma.groupMember.update({
      where: { id: targetMemberId },
      data: { leftAt: new Date() },
    });
  }

  /**
   * Get a group member record — verify membership.
   * Used internally by other services to prevent IDOR.
   */
  async requireMembership(groupId: string, userId: string) {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId, leftAt: null },
    });
    if (!member) {
      throw new ForbiddenError('You are not a member of this group');
    }
    return member;
  }

  /**
   * Require specific role(s) for an operation.
   */
  async requireRole(
    groupId: string,
    userId: string,
    roles: GroupMemberRole[],
  ) {
    const member = await this.requireMembership(groupId, userId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenError(
        `This action requires one of: ${roles.join(', ')}`,
      );
    }
    return member;
  }
}
