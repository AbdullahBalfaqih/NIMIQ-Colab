import { z } from 'zod';
import { ValidationError } from './errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');

export function validateUUID(value: string, fieldName = 'id'): string {
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid UUID v4`);
  }
  return value;
}

// ─── Money ────────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ['USD', 'NIM', 'USDT', 'EUR', 'GBP', 'SAR', 'AED'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/** Maximum allowed amount: 1,000,000 in base currency */
export const MAX_AMOUNT_CENTS = BigInt(100_000_000_00); // $1M in cents

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

// Amount as string (e.g., "10.50") — parsed to bigint cents by money service
export const amountStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive number with at most 2 decimal places')
  .refine(v => parseFloat(v) > 0, 'Amount must be greater than 0')
  .refine(v => parseFloat(v) <= 1_000_000, 'Amount must not exceed 1,000,000');

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  displayName: z.string().min(2).max(100).trim(),
});

export const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

// ─── Groups ───────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  emoji: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  currency: currencySchema,
});

export const addMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// ─── Goals ────────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional(),
  targetAmount: amountStringSchema,
  currency: currencySchema,
  deadline: z
    .string()
    .datetime()
    .refine(d => new Date(d) > new Date(), 'Deadline must be in the future')
    .optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

// ─── Payment Requests ─────────────────────────────────────────────────────────

export const createPaymentRequestSchema = z.object({
  groupId: uuidSchema,
  goalId: uuidSchema.optional(),
  recipientId: uuidSchema,
  amount: amountStringSchema,
  currency: currencySchema,
  purpose: z.string().min(2).max(255).trim(),
  note: z.string().max(500).trim().optional(),
  expiresInHours: z.number().int().min(1).max(168).default(48), // 1h–7d
});

// ─── Payment Prepare ─────────────────────────────────────────────────────────

export const preparePaymentSchema = z.object({
  paymentRequestId: uuidSchema,
  senderAddress: z.string().min(5).max(100).trim(),
});

// ─── Payment Verify ───────────────────────────────────────────────────────────

export const verifyPaymentSchema = z.object({
  paymentIntentId: uuidSchema,
  nimiqTxHash: z.string().min(10).max(128).trim(),
});

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiChatSchema = z.object({
  groupId: uuidSchema,
  message: z.string().min(1).max(2000).trim(),
  conversationId: uuidSchema.optional(),
});

export const confirmActionSchema = z.object({
  confirmed: z.boolean(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new ValidationError(`${firstError.path.join('.')}: ${firstError.message}`);
  }
  return result.data;
}

export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  return validateBody(schema, query);
}
