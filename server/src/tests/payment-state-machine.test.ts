import { describe, it, expect } from 'vitest';
import { transition, isTerminalState } from '../modules/payments/payment-state-machine';
import type { PaymentIntentStatus } from '@prisma/client';

describe('Payment State Machine', () => {

  describe('isTerminalState', () => {
    const terminals: PaymentIntentStatus[] = ['CONFIRMED', 'EXPIRED', 'CANCELLED', 'FAILED', 'REJECTED'];
    terminals.forEach(state => {
      it(`identifies ${state} as terminal`, () => {
        expect(isTerminalState(state)).toBe(true);
      });
    });

    const nonTerminals: PaymentIntentStatus[] = ['CREATED', 'AWAITING_USER_CONFIRMATION', 'SUBMITTED', 'VERIFYING'];
    nonTerminals.forEach(state => {
      it(`identifies ${state} as non-terminal`, () => {
        expect(isTerminalState(state)).toBe(false);
      });
    });
  });

  describe('Valid transitions', () => {
    it('CREATED → AWAITING_USER_CONFIRMATION', () => {
      expect(() => transition('CREATED', 'AWAITING_USER_CONFIRMATION')).not.toThrow();
    });

    it('CREATED → CANCELLED', () => {
      expect(() => transition('CREATED', 'CANCELLED')).not.toThrow();
    });

    it('AWAITING_USER_CONFIRMATION → SUBMITTED', () => {
      expect(() => transition('AWAITING_USER_CONFIRMATION', 'SUBMITTED')).not.toThrow();
    });

    it('AWAITING_USER_CONFIRMATION → CANCELLED', () => {
      expect(() => transition('AWAITING_USER_CONFIRMATION', 'CANCELLED')).not.toThrow();
    });

    it('AWAITING_USER_CONFIRMATION → EXPIRED', () => {
      expect(() => transition('AWAITING_USER_CONFIRMATION', 'EXPIRED')).not.toThrow();
    });

    it('SUBMITTED → VERIFYING', () => {
      expect(() => transition('SUBMITTED', 'VERIFYING')).not.toThrow();
    });

    it('SUBMITTED → FAILED', () => {
      expect(() => transition('SUBMITTED', 'FAILED')).not.toThrow();
    });

    it('VERIFYING → CONFIRMED', () => {
      expect(() => transition('VERIFYING', 'CONFIRMED')).not.toThrow();
    });

    it('VERIFYING → REJECTED', () => {
      expect(() => transition('VERIFYING', 'REJECTED')).not.toThrow();
    });
  });

  describe('Invalid transitions — security critical', () => {
    // CRITICAL: These must all throw to prevent payment manipulation

    it('CONFIRMED → PENDING is IMPOSSIBLE', () => {
      expect(() => transition('CONFIRMED', 'CREATED')).toThrow();
    });

    it('CONFIRMED → AWAITING_USER_CONFIRMATION is IMPOSSIBLE', () => {
      expect(() => transition('CONFIRMED', 'AWAITING_USER_CONFIRMATION')).toThrow();
    });

    it('CONFIRMED → any state is IMPOSSIBLE', () => {
      const allStates: PaymentIntentStatus[] = [
        'CREATED', 'AWAITING_USER_CONFIRMATION', 'SUBMITTED',
        'VERIFYING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'FAILED', 'REJECTED',
      ];
      allStates.forEach(state => {
        expect(() => transition('CONFIRMED', state)).toThrow('terminal state');
      });
    });

    it('REJECTED → any state is IMPOSSIBLE', () => {
      expect(() => transition('REJECTED', 'SUBMITTED')).toThrow('terminal state');
    });

    it('FAILED → any state is IMPOSSIBLE', () => {
      expect(() => transition('FAILED', 'VERIFYING')).toThrow('terminal state');
    });

    it('EXPIRED → any state is IMPOSSIBLE', () => {
      expect(() => transition('EXPIRED', 'SUBMITTED')).toThrow('terminal state');
    });

    it('CANCELLED → any state is IMPOSSIBLE', () => {
      expect(() => transition('CANCELLED', 'CREATED')).toThrow('terminal state');
    });

    it('CREATED → CONFIRMED is IMPOSSIBLE (skipping steps)', () => {
      expect(() => transition('CREATED', 'CONFIRMED')).toThrow();
    });

    it('CREATED → VERIFYING is IMPOSSIBLE', () => {
      expect(() => transition('CREATED', 'VERIFYING')).toThrow();
    });

    it('SUBMITTED → CONFIRMED is IMPOSSIBLE (skipping VERIFYING)', () => {
      expect(() => transition('SUBMITTED', 'CONFIRMED')).toThrow();
    });
  });

  describe('Error messages', () => {
    it('includes current and target state in error', () => {
      expect(() => transition('CONFIRMED', 'PENDING' as any)).toThrow();
    });

    it('mentions terminal state in error for terminal source', () => {
      try {
        transition('CONFIRMED', 'CREATED');
        expect.fail('Should have thrown');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('terminal state');
      }
    });
  });
});
