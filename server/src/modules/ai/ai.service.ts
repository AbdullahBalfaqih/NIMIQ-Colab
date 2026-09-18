import { GoogleGenerativeAI, type FunctionDeclaration } from '@google/generative-ai';
import prisma from '../../database/prisma';
import { GoalsService } from '../goals/goals.service';
import { GroupsService } from '../groups/groups.service';
import { PaymentService } from '../payments/payment.service';
import { AuditService } from '../audit/audit.service';
import { optimizeContributions, formatBaseUnits } from '../../services/money/money.service';
import type { SupportedCurrency } from '../../common/validation';
import { randomBytes } from 'crypto';

/**
 * AI Financial Group Agent
 *
 * Security Model:
 * - Read-only tools execute directly.
 * - Financial action tools return PROPOSALS only.
 * - Proposals are stored as ai_pending_actions requiring explicit user confirmation.
 * - The AI NEVER directly executes financial operations.
 * - The AI NEVER has access to secrets, keys, or raw DB queries.
 * - User-generated content is treated as untrusted (prompt injection defense).
 */

const goalsService = new GoalsService();
const groupsService = new GroupsService();
const paymentService = new PaymentService();
const auditService = new AuditService();

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOL_DECLARATIONS: any[] = [
  {
    name: 'get_group_status',
    description: 'Get the current status of the group including name, currency, and member count. Use this first to understand the group context.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string', description: 'The group ID' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'get_members',
    description: 'Get all members of the group with their payment status (paid/unpaid) for the active goal.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'get_goal_progress',
    description: 'Get the financial progress of the active goal: collected amount, target, remaining, and percentage.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'get_payment_requests',
    description: 'Get all payment requests for the group, including their status (PENDING, PAID, EXPIRED, etc.)',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
        status: { type: 'string', description: 'Filter by status (optional)' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'get_transactions',
    description: 'Get the verified payment transaction history for the group.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'calculate_contributions',
    description: 'Calculate how much each unpaid member needs to contribute to close the funding gap. Uses deterministic backend calculation — never estimates.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'detect_anomaly',
    description: 'Check if there are any suspicious payment patterns or anomalies in the group.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
  // ─── Financial action tools (return proposals, not executions) ────────────
  {
    name: 'propose_payment_request',
    description: 'PROPOSE creating a payment request for a member. This does NOT create the request — it returns a proposal that requires explicit user confirmation.',
    parameters: {
      type: 'object' as any,
      properties: {
        groupId: { type: 'string' },
        recipientId: { type: 'string', description: 'The user ID of the person who needs to pay' },
        amount: { type: 'string', description: 'Amount in human-readable format (e.g., "40.00")' },
        currency: { type: 'string' },
        purpose: { type: 'string' },
      },
      required: ['groupId', 'recipientId', 'amount', 'currency', 'purpose'],
    },
  },
  {
    name: 'propose_update_goal',
    description: 'PROPOSE updating the goal deadline or target. Returns a proposal requiring user confirmation.',
    parameters: {
      type: 'object' as any,
      properties: {
        goalId: { type: 'string' },
        deadline: { type: 'string', description: 'ISO date string' },
        targetAmount: { type: 'string' },
      },
      required: ['goalId'],
    },
  },
];

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(groupContext: string): string {
  return `You are "The Operator", the intelligent AI assistant in "Nimiq Colab" (an autonomous collaborative NIMIQ financial and group wallet platform).

YOUR CAPABILITIES & BEHAVIOR:
1. Universal & Open-Minded Assistant:
   - Accept, understand, and warmly answer ANY question or prompt the user sends, whether it is related to our Nimiq Colab system, NIMIQ crypto, or anything general (everyday questions, greetings, programming, advice, ideas, or general knowledge).
   - If the user greets you (e.g., "مرحبا", "سلام", "اهلا", "hello", "hi"), greet them warmly and respectfully in their language and offer your assistance.
   - Always match the user's language. If the user writes in Arabic, respond in clear, fluent, natural Arabic. If in English, respond in English.
2. Group Vault & Financial Intelligence:
   - When asked about the group, members, vault balance, trip goals, or who hasn't paid, use the provided tools or group context to provide accurate data.
   - Propose payment requests or actions using tools when the user asks to remind, request, or initiate payments.
3. Security & Reliability:
   - For financial queries about this group, use the provided tools.
   - Financial actions (such as payment requests) create a proposal that requires the user's explicit confirmation.

CURRENT GROUP CONTEXT:
${groupContext}`;
}

// ─── Tool Execution ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  conversationId: string,
  sessionGroupId: string,
): Promise<unknown> {
  // Always enforce verified session groupId to prevent LLM hallucinations
  const groupId = sessionGroupId || (args.groupId as string | undefined);

  // For all group operations, verify membership
  if (groupId) {
    try {
      await groupsService.requireMembership(groupId, userId);
    } catch {
      return { error: 'ACCESS_DENIED', message: 'You are not a member of this group' };
    }
  }

  switch (toolName) {
    case 'get_group_status': {
      const group = await prisma.group.findFirst({
        where: { id: groupId!, deletedAt: null },
        include: { _count: { select: { members: true } } },
      });
      if (!group) return { error: 'GROUP_NOT_FOUND' };
      return {
        id: group.id,
        name: group.name,
        currency: group.currency,
        memberCount: group._count.members,
        createdAt: group.createdAt,
      };
    }

    case 'get_members': {
      const group = await prisma.group.findFirst({
        where: { id: groupId!, deletedAt: null },
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { id: true, displayName: true } } },
          },
          goals: {
            where: { status: 'ACTIVE' },
            include: { contributions: { select: { groupMemberId: true } } },
            take: 1,
          },
        },
      });
      if (!group) return { error: 'GROUP_NOT_FOUND' };

      const paidMemberIds = new Set(
        group.goals[0]?.contributions.map(c => c.groupMemberId) ?? [],
      );

      return {
        members: group.members.map(m => ({
          id: m.userId,
          displayName: m.user.displayName,
          role: m.role,
          paid: paidMemberIds.has(m.id),
        })),
        paidCount: paidMemberIds.size,
        unpaidCount: group.members.length - paidMemberIds.size,
      };
    }

    case 'get_goal_progress': {
      const progress = await goalsService.getGroupProgress(groupId!);
      return progress;
    }

    case 'get_payment_requests': {
      const requests = await prisma.paymentRequest.findMany({
        where: {
          groupId: groupId!,
          ...(args.status ? { status: args.status as any } : {}),
        },
        include: {
          requester: { select: { displayName: true } },
          recipient: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return {
        requests: requests.map(r => ({
          id: r.id,
          requester: r.requester.displayName,
          recipient: r.recipient.displayName,
          amount: r.amountCents.toString(),
          currency: r.currency,
          purpose: r.purpose,
          status: r.status,
          expiresAt: r.expiresAt,
        })),
        total: requests.length,
      };
    }

    case 'get_transactions': {
      const transactions = await prisma.transaction.findMany({
        where: { paymentIntent: { paymentRequest: { groupId: groupId! } } },
        include: {
          paymentIntent: {
            include: {
              paymentRequest: {
                include: {
                  requester: { select: { displayName: true } },
                  recipient: { select: { displayName: true } },
                },
              },
            },
          },
        },
        orderBy: { confirmedAt: 'desc' },
        take: 20,
      });
      return {
        transactions: transactions.map(t => ({
          id: t.id,
          txHash: t.nimiqTxHash,
          amount: t.amountCents.toString(),
          currency: t.currency,
          paidBy: t.paymentIntent.paymentRequest.recipient.displayName,
          paidTo: t.paymentIntent.paymentRequest.requester.displayName,
          confirmedAt: t.confirmedAt,
        })),
      };
    }

    case 'calculate_contributions': {
      const progress = await goalsService.getGroupProgress(groupId!);
      if (!progress.length) return { error: 'No active goals found' };

      const goal = progress[0];
      return {
        targetAmount: goal.targetAmountFormatted,
        collectedAmount: goal.collectedAmountFormatted,
        progressPercent: goal.progressPercent,
        unpaidMembers: goal.unpaidMembers,
        optimization: goal.optimization,
        explanation: goal.optimization.explanation,
      };
    }

    case 'detect_anomaly': {
      const recent = await prisma.auditLog.findMany({
        where: {
          groupId: groupId!,
          action: 'ANOMALY_DETECTED',
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
      return {
        anomaliesDetected: recent.length,
        recentAnomalies: recent.map(a => ({
          timestamp: a.timestamp,
          metadata: a.metadata,
        })),
      };
    }

    case 'propose_payment_request': {
      // Create a pending action — NOT actual payment request
      const pendingAction = await prisma.aiPendingAction.create({
        data: {
          conversationId,
          userId,
          type: 'CREATE_PAYMENT_REQUEST',
          payload: {
            groupId: args.groupId,
            recipientId: args.recipientId,
            amount: args.amount,
            currency: args.currency,
            purpose: args.purpose,
          } as any,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min TTL
        },
      });

      await auditService.log({
        actorId: userId,
        action: 'AI_ACTION_PROPOSED',
        resource: 'ai_pending_actions',
        resourceId: pendingAction.id,
        result: 'SUCCESS',
        groupId: groupId!,
        metadata: { type: 'CREATE_PAYMENT_REQUEST', payload: args } as any,
      });

      return {
        proposal: true,
        actionId: pendingAction.id,
        type: 'CREATE_PAYMENT_REQUEST',
        details: args,
        expiresAt: pendingAction.expiresAt,
        message: 'This is a PROPOSAL only. User must confirm via POST /api/ai/actions/' + pendingAction.id + '/confirm',
      };
    }

    case 'propose_update_goal': {
      const pendingAction = await prisma.aiPendingAction.create({
        data: {
          conversationId,
          userId,
          type: 'UPDATE_GOAL',
          payload: args as any,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      return {
        proposal: true,
        actionId: pendingAction.id,
        type: 'UPDATE_GOAL',
        details: args,
        expiresAt: pendingAction.expiresAt,
      };
    }

    default:
      return { error: 'Unknown tool', toolName };
  }
}

// ─── Main Agent Function ──────────────────────────────────────────────────────

export interface AiChatResponse {
  message: string;
  conversationId: string;
  requiresConfirmation: boolean;
  pendingAction?: {
    id: string;
    type: string;
    details: Record<string, unknown>;
    expiresAt: Date;
  };
}

export async function runAiAgent(
  userId: string,
  groupId: string,
  userMessage: string,
  conversationId?: string,
): Promise<AiChatResponse> {
  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId, groupId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 20 },
      },
    });
  }

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: { groupId, userId },
      include: { messages: true },
    });
  }

  // Sanitize user message — treat as untrusted (prompt injection defense)
  const sanitizedMessage = userMessage
    .slice(0, 2000) // Hard limit
    .replace(/```/g, '`') // Prevent code injection
    .trim();

  // Load group context for system prompt
  const groupContext = await buildGroupContext(groupId, userId);

  // Save user message
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: sanitizedMessage,
    },
  });

  // Check if OpenRouter is configured
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && !openRouterKey.startsWith('openrouter_fallback')) {
    return await runOpenRouterAgent(
      userId,
      groupId,
      sanitizedMessage,
      conversation,
      groupContext,
      openRouterKey,
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Neither OPENROUTER_API_KEY nor GEMINI_API_KEY configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: buildSystemPrompt(groupContext),
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });

  // Build conversation history for context
  const history = conversation.messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  let result = await chat.sendMessage(sanitizedMessage);
  let response = result.response;

  let finalText = '';
  let pendingActionId: string | undefined;
  let pendingActionType: string | undefined;
  let pendingActionDetails: Record<string, unknown> | undefined;
  let pendingActionExpiry: Date | undefined;

  // ── Tool use loop ────────────────────────────────────────────────────────────
  const MAX_ITERATIONS = 5;
  let iterations = 0;

  while (response.functionCalls() && iterations < MAX_ITERATIONS) {
    iterations++;
    const functionCalls = response.functionCalls()!;
    const toolResults = [];

    for (const call of functionCalls) {
      const toolResult = await executeTool(
        call.name,
        call.args as Record<string, unknown>,
        userId,
        conversation.id,
        groupId,
      );

      // Check if this is a pending action proposal
      const resultObj = toolResult as Record<string, unknown>;
      if (resultObj?.proposal && resultObj?.actionId) {
        pendingActionId = resultObj.actionId as string;
        pendingActionType = resultObj.type as string;
        pendingActionDetails = resultObj.details as Record<string, unknown>;
        pendingActionExpiry = resultObj.expiresAt as Date;
      }

      toolResults.push({
        functionResponse: {
          name: call.name,
          response: { result: toolResult },
        },
      });
    }

    // Continue conversation with tool results
    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  finalText = response.text();

  // Save assistant message
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: finalText,
    },
  });

  const requiresConfirmation = !!pendingActionId;

  return {
    message: finalText,
    conversationId: conversation.id,
    requiresConfirmation,
    ...(requiresConfirmation && pendingActionId
      ? {
          pendingAction: {
            id: pendingActionId,
            type: pendingActionType!,
            details: pendingActionDetails!,
            expiresAt: pendingActionExpiry!,
          },
        }
      : {}),
  };
}

// ─── OpenRouter Free Models & Agent Runner ─────────────────────────────────────

const OPENROUTER_FREE_MODELS = [
  'deepseek/deepseek-v4-flash-0731:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash-fin:free',
];

const OPENAI_TOOLS = TOOL_DECLARATIONS.map(d => ({
  type: 'function',
  function: {
    name: d.name,
    description: d.description,
    parameters: d.parameters,
  },
}));

async function runOpenRouterAgent(
  userId: string,
  groupId: string,
  sanitizedMessage: string,
  conversation: any,
  groupContext: string,
  openRouterKey: string,
): Promise<AiChatResponse> {
  const systemPrompt = buildSystemPrompt(groupContext);

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversation.messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: sanitizedMessage },
  ];

  let pendingActionId: string | undefined;
  let pendingActionType: string | undefined;
  let pendingActionDetails: Record<string, unknown> | undefined;
  let pendingActionExpiry: Date | undefined;
  let finalText = '';

  const MAX_ITERATIONS = 5;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    let data: any = null;
    let lastErr: any = null;

    // Fallback loop across the verified free models
    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nimiqcolab.app',
            'X-Title': 'Nimiq Colab AI',
          },
          body: JSON.stringify({
            model,
            messages,
            tools: OPENAI_TOOLS,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Model ${model} returned ${response.status}: ${errBody}`);
        }

        const resJson = (await response.json()) as any;
        if (resJson.error) {
          throw new Error(resJson.error.message || `Error with model ${model}`);
        }
        if (resJson.choices && resJson.choices.length > 0) {
          data = resJson;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        continue;
      }
    }

    if (!data) {
      throw lastErr || new Error('All OpenRouter AI models failed to respond');
    }

    const choice = data.choices[0];
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);

      for (const call of msg.tool_calls) {
        let args = {};
        try {
          args = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function.arguments;
        } catch {
          args = {};
        }

        const toolResult = await executeTool(
          call.function.name,
          args as Record<string, unknown>,
          userId,
          conversation.id,
          groupId,
        );

        const resultObj = toolResult as Record<string, unknown>;
        if (resultObj?.proposal && resultObj?.actionId) {
          pendingActionId = resultObj.actionId as string;
          pendingActionType = resultObj.type as string;
          pendingActionDetails = resultObj.details as Record<string, unknown>;
          pendingActionExpiry = resultObj.expiresAt as Date;
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult, (_k, v) =>
            typeof v === 'bigint' ? v.toString() : v,
          ),
        });
      }
    } else {
      finalText = msg.content || '';
      break;
    }
  }

  if (!finalText && messages[messages.length - 1]?.role === 'assistant') {
    finalText = messages[messages.length - 1].content || 'Action executed successfully.';
  }

  // Save assistant message to Prisma
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: finalText,
    },
  });

  const requiresConfirmation = !!pendingActionId;

  return {
    message: finalText,
    conversationId: conversation.id,
    requiresConfirmation,
    ...(requiresConfirmation && pendingActionId
      ? {
          pendingAction: {
            id: pendingActionId,
            type: pendingActionType!,
            details: pendingActionDetails!,
            expiresAt: pendingActionExpiry!,
          },
        }
      : {}),
  };
}

async function buildGroupContext(groupId: string, userId: string): Promise<string> {
  try {
    const progress = await goalsService.getGroupProgress(groupId);
    if (!progress.length) return 'No active goals found for this group.';

    const goal = progress[0];
    return [
      `Goal: ${goal.goalName}`,
      `Target: ${goal.targetAmountFormatted} ${goal.currency}`,
      `Collected: ${goal.collectedAmountFormatted} (${goal.progressPercent}%)`,
      `Members paid: ${goal.paidMemberCount}/${goal.totalMemberCount}`,
      `Unpaid members: ${goal.unpaidMembers.map(m => m.displayName).join(', ') || 'None'}`,
      goal.deadline ? `Deadline: ${new Date(goal.deadline).toDateString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return 'Unable to load group context.';
  }
}
