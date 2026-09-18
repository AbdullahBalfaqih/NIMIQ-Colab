import prisma from '../../database/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors';
import { parseAmountToBaseUnits, formatBaseUnits, optimizeContributions } from '../../services/money/money.service';
import type { SupportedCurrency } from '../../common/validation';

export class GoalsService {

  async createGoal(
    groupId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      targetAmount: string;
      currency: SupportedCurrency;
      deadline?: string;
    },
  ) {
    const targetAmountCents = parseAmountToBaseUnits(data.targetAmount, data.currency);

    const goal = await prisma.goal.create({
      data: {
        groupId,
        name: data.name,
        description: data.description,
        targetAmount: targetAmountCents,
        currency: data.currency,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    return {
      ...goal,
      targetAmountFormatted: formatBaseUnits(goal.targetAmount, data.currency),
    };
  }

  async getGoal(goalId: string, requestingUserId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, status: { not: 'CANCELLED' } },
      include: {
        group: {
          include: {
            members: { where: { userId: requestingUserId, leftAt: null } },
          },
        },
        contributions: {
          include: {
            groupMember: {
              include: { user: { select: { id: true, displayName: true } } },
            },
          },
        },
      },
    });

    if (!goal) throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');
    if (goal.group.members.length === 0) {
      throw new ForbiddenError('You do not have access to this goal');
    }

    const collectedCents = goal.contributions.reduce(
      (sum, c) => sum + c.amountCents,
      0n,
    );
    const currency = goal.currency as SupportedCurrency;

    return {
      ...goal,
      targetAmountFormatted: formatBaseUnits(goal.targetAmount, currency),
      collectedAmountCents: collectedCents,
      collectedAmountFormatted: formatBaseUnits(collectedCents, currency),
      progressPercent: goal.targetAmount > 0n
        ? Number((collectedCents * 100n) / goal.targetAmount)
        : 0,
    };
  }

  async getGroupProgress(groupId: string) {
    const goals = await prisma.goal.findMany({
      where: { groupId, status: 'ACTIVE' },
      include: {
        contributions: { select: { amountCents: true, groupMemberId: true } },
        group: {
          include: {
            members: {
              where: { leftAt: null },
              include: { user: { select: { id: true, displayName: true } } },
            },
          },
        },
      },
    });

    return goals.map(goal => {
      const currency = goal.currency as SupportedCurrency;
      const collectedCents = goal.contributions.reduce((s, c) => s + c.amountCents, 0n);
      const paidMemberIds = new Set(goal.contributions.map(c => c.groupMemberId));
      const unpaidMembers = goal.group.members
        .filter(m => !paidMemberIds.has(m.id))
        .map(m => ({ id: m.id, userId: m.userId, displayName: m.user.displayName }));

      const optimization = optimizeContributions(
        goal.targetAmount,
        collectedCents,
        unpaidMembers.map(m => ({ id: m.id })),
        currency,
      );

      return {
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: goal.targetAmount.toString(),
        targetAmountFormatted: formatBaseUnits(goal.targetAmount, currency),
        collectedAmount: collectedCents.toString(),
        collectedAmountFormatted: formatBaseUnits(collectedCents, currency),
        currency,
        progressPercent: goal.targetAmount > 0n
          ? Number((collectedCents * 100n) / goal.targetAmount)
          : 0,
        paidMemberCount: paidMemberIds.size,
        totalMemberCount: goal.group.members.length,
        unpaidMembers,
        deadline: goal.deadline,
        optimization,
      };
    });
  }

  async updateGoal(
    goalId: string,
    requestingUserId: string,
    data: Partial<{ name: string; description: string; targetAmount: string; deadline: string; currency: SupportedCurrency }>,
  ) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.targetAmount) {
      const currency = (data.currency ?? goal.currency) as SupportedCurrency;
      updateData.targetAmount = parseAmountToBaseUnits(data.targetAmount, currency);
    }

    return prisma.goal.update({ where: { id: goalId }, data: updateData });
  }
}
