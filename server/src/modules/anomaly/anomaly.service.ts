import prisma from '../../database/prisma';
import { AnomalyError } from '../../common/errors';
import { AuditService } from '../audit/audit.service';

export interface AnomalyCheckResult {
  passed: boolean;
  findings: AnomalyFinding[];
}

export interface AnomalyFinding {
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata?: Record<string, unknown>;
}

type AnomalyType =
  | 'DUPLICATE_TRANSACTION'
  | 'AMOUNT_MISMATCH'
  | 'RECIPIENT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'STALE_INTENT'
  | 'REPLAY_ATTACK'
  | 'ALREADY_CONFIRMED'
  | 'INVALID_CONFIRMATIONS';

const auditService = new AuditService();

export class AnomalyService {

  /**
   * Run all anomaly checks before confirming a payment.
   * Throws AnomalyError if any CRITICAL finding is detected.
   * The AI CANNOT override these checks.
   */
  async checkPaymentVerification(params: {
    intentId: string;
    submittedTxHash: string;
    blockchainAmountBaseUnits: bigint;
    blockchainRecipientAddress: string;
    blockchainCurrency: string;
    blockchainConfirmations: number;
    actorId: string;
    requestId?: string;
  }): Promise<AnomalyCheckResult> {
    const findings: AnomalyFinding[] = [];

    const intent = await prisma.paymentIntent.findUnique({
      where: { id: params.intentId },
    });

    if (!intent) {
      throw new AnomalyError('PAYMENT_INTENT_NOT_FOUND', 'Payment intent not found');
    }

    // ── Check 1: Already confirmed ─────────────────────────────────────────────
    if (intent.status === 'CONFIRMED') {
      findings.push({
        type: 'ALREADY_CONFIRMED',
        severity: 'CRITICAL',
        description: `Payment intent ${params.intentId} is already CONFIRMED. Replay detected.`,
      });
    }

    // ── Check 2: Stale intent ───────────────────────────────────────────────────
    if (intent.expiresAt < new Date()) {
      findings.push({
        type: 'STALE_INTENT',
        severity: 'CRITICAL',
        description: `Payment intent expired at ${intent.expiresAt.toISOString()}`,
      });
    }

    // ── Check 3: Duplicate transaction hash ────────────────────────────────────
    const existingTx = await prisma.transaction.findUnique({
      where: { nimiqTxHash: params.submittedTxHash },
    });
    if (existingTx) {
      findings.push({
        type: 'DUPLICATE_TRANSACTION',
        severity: 'CRITICAL',
        description: `Transaction ${params.submittedTxHash} has already been recorded`,
        metadata: { existingTransactionId: existingTx.id },
      });
    }

    // ── Check 4: Amount mismatch ────────────────────────────────────────────────
    if (intent.amountCents !== params.blockchainAmountBaseUnits) {
      findings.push({
        type: 'AMOUNT_MISMATCH',
        severity: 'CRITICAL',
        description: [
          `Amount mismatch detected.`,
          `Expected: ${intent.amountCents} base units.`,
          `Blockchain: ${params.blockchainAmountBaseUnits} base units.`,
        ].join(' '),
        metadata: {
          expected: intent.amountCents.toString(),
          actual: params.blockchainAmountBaseUnits.toString(),
        },
      });
    }

    // ── Check 5: Recipient mismatch ─────────────────────────────────────────────
    const normalizeAddr = (a: string) => a.trim().toLowerCase();
    if (normalizeAddr(intent.recipientAddress) !== normalizeAddr(params.blockchainRecipientAddress)) {
      findings.push({
        type: 'RECIPIENT_MISMATCH',
        severity: 'CRITICAL',
        description: `Recipient address mismatch. Expected: ${intent.recipientAddress}. Got: ${params.blockchainRecipientAddress}`,
        metadata: {
          expected: intent.recipientAddress,
          actual: params.blockchainRecipientAddress,
        },
      });
    }

    // ── Check 6: Currency mismatch ──────────────────────────────────────────────
    if (intent.currency.toUpperCase() !== params.blockchainCurrency.toUpperCase()) {
      findings.push({
        type: 'CURRENCY_MISMATCH',
        severity: 'CRITICAL',
        description: `Currency mismatch. Expected: ${intent.currency}. Got: ${params.blockchainCurrency}`,
      });
    }

    // ── Check 7: Insufficient confirmations ─────────────────────────────────────
    const minConfirmations = parseInt(process.env.NIMIQ_MIN_CONFIRMATIONS ?? '2', 10);
    if (params.blockchainConfirmations < minConfirmations) {
      findings.push({
        type: 'INVALID_CONFIRMATIONS',
        severity: 'HIGH',
        description: `Insufficient confirmations: ${params.blockchainConfirmations}/${minConfirmations}`,
      });
    }

    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');

    if (findings.length > 0) {
      // Log all anomalies
      await auditService.log({
        actorId: params.actorId,
        action: 'ANOMALY_DETECTED',
        resource: 'payment_intents',
        resourceId: params.intentId,
        result: criticalFindings.length > 0 ? 'FAILURE' : 'SUCCESS',
        requestId: params.requestId,
        metadata: { findings },
      });
    }

    const passed = criticalFindings.length === 0;

    return { passed, findings };
  }

  /**
   * Detect duplicate payment attempt by same user in short window.
   */
  async detectRapidRepeat(userId: string, paymentRequestId: string): Promise<boolean> {
    const recentAttempts = await prisma.paymentIntent.count({
      where: {
        paymentRequestId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // 5 min
        status: { in: ['CREATED', 'AWAITING_USER_CONFIRMATION', 'SUBMITTED'] },
      },
    });
    return recentAttempts > 3;
  }
}
