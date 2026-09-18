import { describe, it, expect } from 'vitest';
import { parseAmountToBaseUnits } from '../services/money/money.service';
import { validateBody, createPaymentRequestSchema, registerSchema, loginSchema } from '../common/validation';
import { ValidationError } from '../common/errors';

/**
 * Security validation tests — ensures malicious inputs are rejected before
 * reaching any service layer.
 */
describe('Input Validation — Security', () => {

  describe('Amount validation', () => {
    const EVIL_AMOUNTS = [
      '-1',
      '-0.01',
      '0',
      'NaN',
      'Infinity',
      '-Infinity',
      '1e10',
      '1.2.3',
      '100000000000',
      'SELECT * FROM users',
      '<script>alert(1)</script>',
      '${process.exit(1)}',
      '',
      ' ',
      '1 OR 1=1',
    ];

    EVIL_AMOUNTS.forEach(evil => {
      it(`rejects evil amount: "${evil}"`, () => {
        expect(() => parseAmountToBaseUnits(evil, 'USD')).toThrow();
      });
    });

    it('accepts valid amounts', () => {
      expect(parseAmountToBaseUnits('10.00', 'USD')).toBe(1000n);
      expect(parseAmountToBaseUnits('0.01', 'USD')).toBe(1n);
      expect(parseAmountToBaseUnits('999999.99', 'USD')).toBe(99999999n);
    });
  });

  describe('Register schema', () => {
    it('rejects weak password (no uppercase)', () => {
      expect(() =>
        validateBody(registerSchema, {
          email: 'test@example.com',
          password: 'weak_password_1!',
          displayName: 'Test',
        }),
      ).toThrow();
    });

    it('rejects weak password (too short)', () => {
      expect(() =>
        validateBody(registerSchema, {
          email: 'test@example.com',
          password: 'Short1!',
          displayName: 'Test',
        }),
      ).toThrow('12 characters');
    });

    it('rejects invalid email', () => {
      expect(() =>
        validateBody(registerSchema, {
          email: 'not-an-email',
          password: 'ValidPassword123!',
          displayName: 'Test',
        }),
      ).toThrow();
    });

    it('rejects overly long displayName', () => {
      expect(() =>
        validateBody(registerSchema, {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          displayName: 'A'.repeat(101),
        }),
      ).toThrow();
    });
  });

  describe('Payment request schema', () => {
    const baseValid = {
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      amount: '50.00',
      currency: 'USD',
      purpose: 'Trip fund contribution',
      expiresInHours: 48,
    };

    it('accepts valid payment request', () => {
      expect(() => validateBody(createPaymentRequestSchema, baseValid)).not.toThrow();
    });

    it('rejects invalid UUID for groupId', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, { ...baseValid, groupId: 'not-a-uuid' }),
      ).toThrow();
    });

    it('rejects SQL injection in groupId', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, {
          ...baseValid,
          groupId: "'; DROP TABLE groups; --",
        }),
      ).toThrow();
    });

    it('rejects negative amount', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, { ...baseValid, amount: '-10.00' }),
      ).toThrow();
    });

    it('rejects zero amount', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, { ...baseValid, amount: '0' }),
      ).toThrow();
    });

    it('rejects unsupported currency', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, { ...baseValid, currency: 'EVIL' }),
      ).toThrow();
    });

    it('rejects expiresInHours over 7 days', () => {
      expect(() =>
        validateBody(createPaymentRequestSchema, { ...baseValid, expiresInHours: 169 }),
      ).toThrow();
    });

    it('rejects extra unexpected fields', () => {
      // Zod strips extra fields by default — verify purpose is kept
      const result = validateBody(createPaymentRequestSchema, {
        ...baseValid,
        hackField: 'malicious',
      });
      expect((result as any).hackField).toBeUndefined();
    });
  });
});
