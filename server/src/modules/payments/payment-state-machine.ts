import type { PaymentIntentStatus } from '@prisma/client';
import { PaymentError } from '../../common/errors';

/**
 * Strict Payment State Machine
 *
 * Valid transitions:
 * CREATED → AWAITING_USER_CONFIRMATION
 * AWAITING_USER_CONFIRMATION → SUBMITTED | CANCELLED | EXPIRED
 * SUBMITTED → VERIFYING | FAILED | EXPIRED
 * VERIFYING → CONFIRMED | REJECTED | FAILED
 *
 * Terminal states: CONFIRMED, EXPIRED, CANCELLED, FAILED, REJECTED
 * No transitions allowed FROM terminal states.
 */

const TERMINAL_STATES: Set<PaymentIntentStatus> = new Set([
  'CONFIRMED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
  'REJECTED',
]);

const ALLOWED_TRANSITIONS: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
  CREATED: ['AWAITING_USER_CONFIRMATION', 'CANCELLED'],
  AWAITING_USER_CONFIRMATION: ['SUBMITTED', 'CANCELLED', 'EXPIRED'],
  SUBMITTED: ['VERIFYING', 'FAILED', 'EXPIRED'],
  VERIFYING: ['CONFIRMED', 'REJECTED', 'FAILED'],
  // Terminal states — no outgoing transitions
  CONFIRMED: [],
  EXPIRED: [],
  CANCELLED: [],
  FAILED: [],
  REJECTED: [],
};

export function isTerminalState(status: PaymentIntentStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/**
 * Validate and perform a state transition.
 * Throws PaymentError if the transition is not allowed.
 */
export function transition(
  current: PaymentIntentStatus,
  next: PaymentIntentStatus,
  context?: string,
): void {
  if (isTerminalState(current)) {
    throw new PaymentError(
      'PAYMENT_INVALID_STATE',
      `Payment is in terminal state ${current} and cannot be transitioned${context ? ` (${context})` : ''}`,
    );
  }

  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new PaymentError(
      'PAYMENT_INVALID_STATE',
      `Invalid state transition: ${current} → ${next}. Allowed: ${allowed.join(', ')}`,
    );
  }
}

export type { PaymentIntentStatus };
