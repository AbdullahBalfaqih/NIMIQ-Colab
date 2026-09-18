import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyService } from '../modules/anomaly/anomaly.service';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  default: {
    paymentIntent: {
      findUnique: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
    },
    paymentIntent: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import prisma from '../database/prisma';

describe('Anomaly Detection Service', () => {
  const anomalyService = new AnomalyService();

  const mockIntent = {
    id: 'intent-123',
    amountCents: 5000n,        // $50.00
    currency: 'USD',
    recipientAddress: 'NQ12ABCDEF',
    status: 'SUBMITTED',
    expiresAt: new Date(Date.now() + 60000), // Valid: 1 min from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.paymentIntent.findUnique as any).mockResolvedValue(mockIntent);
    (prisma.transaction.findUnique as any).mockResolvedValue(null); // No duplicate
    (prisma.auditLog.create as any).mockResolvedValue({});
  });

  describe('Amount mismatch detection', () => {
    it('PASSES when amount matches exactly', async () => {
      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 5000n, // Exact match
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const amountFinding = result.findings.find(f => f.type === 'AMOUNT_MISMATCH');
      expect(amountFinding).toBeUndefined();
    });

    it('FAILS when amount is different — even by 1 cent', async () => {
      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 4999n, // $0.01 less
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const amountFinding = result.findings.find(f => f.type === 'AMOUNT_MISMATCH');
      expect(amountFinding).toBeDefined();
      expect(amountFinding!.severity).toBe('CRITICAL');
      expect(result.passed).toBe(false);
    });

    it('FAILS when amount is much larger (overpayment fraud)', async () => {
      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 50000n, // 10x the expected amount
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      expect(result.passed).toBe(false);
    });
  });

  describe('Duplicate transaction detection', () => {
    it('FAILS when same tx hash was already recorded', async () => {
      (prisma.transaction.findUnique as any).mockResolvedValue({
        id: 'existing-tx-id',
        nimiqTxHash: 'duplicate_hash',
      });

      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'duplicate_hash',
        blockchainAmountBaseUnits: 5000n,
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const dupFinding = result.findings.find(f => f.type === 'DUPLICATE_TRANSACTION');
      expect(dupFinding).toBeDefined();
      expect(dupFinding!.severity).toBe('CRITICAL');
      expect(result.passed).toBe(false);
    });
  });

  describe('Recipient mismatch detection', () => {
    it('FAILS when recipient address differs', async () => {
      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 5000n,
        blockchainRecipientAddress: 'NQ99DIFFERENT', // Wrong recipient!
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const recipFinding = result.findings.find(f => f.type === 'RECIPIENT_MISMATCH');
      expect(recipFinding).toBeDefined();
      expect(recipFinding!.severity).toBe('CRITICAL');
      expect(result.passed).toBe(false);
    });

    it('PASSES with case-insensitive address comparison', async () => {
      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 5000n,
        blockchainRecipientAddress: 'nq12abcdef', // lowercase version
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const recipFinding = result.findings.find(f => f.type === 'RECIPIENT_MISMATCH');
      expect(recipFinding).toBeUndefined();
    });
  });

  describe('Stale intent detection', () => {
    it('FAILS for expired payment intent', async () => {
      (prisma.paymentIntent.findUnique as any).mockResolvedValue({
        ...mockIntent,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      });

      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'abc123def456' + '0'.repeat(52),
        blockchainAmountBaseUnits: 5000n,
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const staleFinding = result.findings.find(f => f.type === 'STALE_INTENT');
      expect(staleFinding).toBeDefined();
      expect(result.passed).toBe(false);
    });
  });

  describe('Already confirmed detection (replay attack)', () => {
    it('FAILS when intent is already CONFIRMED', async () => {
      (prisma.paymentIntent.findUnique as any).mockResolvedValue({
        ...mockIntent,
        status: 'CONFIRMED', // Already done!
      });

      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'new_hash' + '0'.repeat(57),
        blockchainAmountBaseUnits: 5000n,
        blockchainRecipientAddress: 'NQ12ABCDEF',
        blockchainCurrency: 'USD',
        blockchainConfirmations: 5,
        actorId: 'user-abc',
      });

      const replayFinding = result.findings.find(f => f.type === 'ALREADY_CONFIRMED');
      expect(replayFinding).toBeDefined();
      expect(replayFinding!.severity).toBe('CRITICAL');
      expect(result.passed).toBe(false);
    });
  });

  describe('Multiple anomalies detected simultaneously', () => {
    it('collects all findings', async () => {
      (prisma.transaction.findUnique as any).mockResolvedValue({ id: 'dup' });
      (prisma.paymentIntent.findUnique as any).mockResolvedValue({
        ...mockIntent,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const result = await anomalyService.checkPaymentVerification({
        intentId: 'intent-123',
        submittedTxHash: 'dup',
        blockchainAmountBaseUnits: 9999n,           // mismatch
        blockchainRecipientAddress: 'NQ99WRONG',     // wrong
        blockchainCurrency: 'EUR',                   // wrong currency
        blockchainConfirmations: 0,
        actorId: 'user-abc',
      });

      expect(result.findings.length).toBeGreaterThanOrEqual(4);
      expect(result.passed).toBe(false);
    });
  });
});
