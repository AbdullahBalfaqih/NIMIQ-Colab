import { describe, it, expect } from 'vitest';
import {
  parseAmountToBaseUnits,
  formatBaseUnits,
  splitEqually,
  optimizeContributions,
  isAmountAcceptable,
} from '../services/money/money.service';

describe('Money Service — Integer Arithmetic', () => {

  describe('parseAmountToBaseUnits', () => {
    it('parses USD correctly', () => {
      expect(parseAmountToBaseUnits('10.50', 'USD')).toBe(1050n);
    });

    it('parses whole numbers', () => {
      expect(parseAmountToBaseUnits('100', 'USD')).toBe(10000n);
    });

    it('parses NIM to Luna', () => {
      expect(parseAmountToBaseUnits('1', 'NIM')).toBe(100000n);
      expect(parseAmountToBaseUnits('1.5', 'NIM')).toBe(150000n);
    });

    it('rejects zero', () => {
      expect(() => parseAmountToBaseUnits('0', 'USD')).toThrow('greater than zero');
    });

    it('rejects negative strings', () => {
      expect(() => parseAmountToBaseUnits('-10', 'USD')).toThrow();
    });

    it('rejects NaN', () => {
      expect(() => parseAmountToBaseUnits('abc', 'USD')).toThrow();
    });

    it('rejects empty string', () => {
      expect(() => parseAmountToBaseUnits('', 'USD')).toThrow();
    });

    it('rejects amount over max', () => {
      expect(() => parseAmountToBaseUnits('1000001', 'USD')).toThrow('exceed');
    });

    it('rejects Infinity', () => {
      expect(() => parseAmountToBaseUnits('Infinity', 'USD')).toThrow();
    });

    it('handles trailing decimal', () => {
      expect(parseAmountToBaseUnits('10.5', 'USD')).toBe(1050n);
    });
  });

  describe('formatBaseUnits', () => {
    it('formats USD correctly', () => {
      expect(formatBaseUnits(1050n, 'USD')).toBe('10.50');
    });

    it('formats zero', () => {
      expect(formatBaseUnits(0n, 'USD')).toBe('0.00');
    });

    it('formats NIM from Luna', () => {
      expect(formatBaseUnits(100000n, 'NIM')).toBe('1.00000');
    });

    it('round-trips USD', () => {
      const original = '42.99';
      const cents = parseAmountToBaseUnits(original, 'USD');
      expect(formatBaseUnits(cents, 'USD')).toBe(original);
    });
  });

  describe('splitEqually', () => {
    it('splits evenly', () => {
      const result = splitEqually(300n, 3);
      expect(result.shares).toEqual([100n, 100n, 100n]);
      expect(result.total).toBe(300n);
      expect(result.remainder).toBe(0n);
    });

    it('handles rounding with remainder', () => {
      // $10 / 3 = $3.33, $3.33, $3.34
      const result = splitEqually(1000n, 3);
      expect(result.total).toBe(1000n);
      // First member gets the extra cent
      expect(result.shares[0]).toBe(334n);
      expect(result.shares[1]).toBe(333n);
      expect(result.shares[2]).toBe(333n);
    });

    it('splits 1 cent among many', () => {
      const result = splitEqually(1n, 5);
      expect(result.total).toBe(1n);
      // One person gets 1, rest get 0
      const sum = result.shares.reduce((a, b) => a + b, 0n);
      expect(sum).toBe(1n);
    });

    it('throws for zero members', () => {
      expect(() => splitEqually(1000n, 0)).toThrow('at least 1');
    });

    it('never produces floating point', () => {
      // All shares must be integers (BigInt)
      const result = splitEqually(10001n, 7);
      result.shares.forEach(s => {
        expect(typeof s).toBe('bigint');
      });
    });
  });

  describe('optimizeContributions', () => {
    it('returns zero when goal reached', () => {
      const result = optimizeContributions(1000n, 1000n, [{ id: 'a' }, { id: 'b' }], 'USD');
      expect(result.remainingAmount).toBe(0n);
    });

    it('splits remaining correctly', () => {
      const unpaid = [{ id: 'a' }, { id: 'b' }];
      const result = optimizeContributions(1000n, 600n, unpaid, 'USD');
      expect(result.remainingAmount).toBe(400n);
      expect(result.suggestedShares.length).toBe(2);
      const total = result.suggestedShares.reduce((s, m) => s + m.amountBaseUnits, 0n);
      expect(total).toBe(400n);
    });

    it('handles single unpaid member', () => {
      const result = optimizeContributions(500n, 320n, [{ id: 'alone' }], 'USD');
      expect(result.suggestedShares[0].amountBaseUnits).toBe(180n);
    });
  });

  describe('isAmountAcceptable', () => {
    it('accepts exact match', () => {
      expect(isAmountAcceptable(1000n, 1000n)).toBe(true);
    });

    it('rejects mismatch with zero tolerance', () => {
      expect(isAmountAcceptable(1000n, 999n)).toBe(false);
      expect(isAmountAcceptable(1000n, 1001n)).toBe(false);
    });

    it('accepts within tolerance', () => {
      expect(isAmountAcceptable(1000n, 999n, 1n)).toBe(true);
    });
  });
});
