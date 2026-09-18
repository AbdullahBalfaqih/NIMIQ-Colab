/**
 * NIMIQ Money Service — Integer Arithmetic Only
 *
 * CRITICAL: Never use floating point for money.
 * All amounts stored and computed as BigInt base units.
 *
 * USD/USDT/EUR: 1 unit = 1 cent (100 cents = $1.00)
 * NIM: 1 unit = 1 Luna (100,000 luna = 1 NIM)
 */

import { ValidationError } from '../../common/errors';
import type { SupportedCurrency } from '../../common/validation';

// ─── Currency Decimal Places ──────────────────────────────────────────────────

const DECIMALS: Record<SupportedCurrency, number> = {
  USD: 2,
  USDT: 2,
  EUR: 2,
  GBP: 2,
  SAR: 2,
  AED: 2,
  NIM: 5, // 1 NIM = 100,000 Luna
};

const MULTIPLIERS: Record<SupportedCurrency, bigint> = {
  USD: 100n,
  USDT: 100n,
  EUR: 100n,
  GBP: 100n,
  SAR: 100n,
  AED: 100n,
  NIM: 100000n, // Luna
};

// Maximum: 1,000,000 in human units
const MAX_HUMAN_UNITS = 1_000_000;

// ─── Parse Amount ─────────────────────────────────────────────────────────────

/**
 * Parse a human-readable amount string to base units (BigInt).
 * e.g., "10.50" USD → 1050n
 *       "1.5" NIM  → 150000n
 */
export function parseAmountToBaseUnits(
  amountStr: string,
  currency: SupportedCurrency,
): bigint {
  if (!amountStr || typeof amountStr !== 'string') {
    throw new ValidationError('Amount must be a non-empty string');
  }

  // Reject anything that's not a simple decimal number
  if (!/^\d+(\.\d+)?$/.test(amountStr)) {
    throw new ValidationError(`Invalid amount format: ${amountStr}`);
  }

  const floatVal = parseFloat(amountStr);
  if (!isFinite(floatVal) || isNaN(floatVal)) {
    throw new ValidationError('Amount must be a finite number');
  }
  if (floatVal <= 0) {
    throw new ValidationError('Amount must be greater than zero');
  }
  if (floatVal > MAX_HUMAN_UNITS) {
    throw new ValidationError(`Amount must not exceed ${MAX_HUMAN_UNITS}`);
  }

  const decimals = DECIMALS[currency];
  const multiplier = MULTIPLIERS[currency];

  // Split integer and decimal parts — avoid floating point arithmetic
  const parts = amountStr.split('.');
  const intPart = BigInt(parts[0]);
  let fracPart = 0n;

  if (parts[1]) {
    // Pad or truncate decimal part to the correct number of places
    const fracStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
    fracPart = BigInt(fracStr);
  }

  return intPart * multiplier + fracPart;
}

/**
 * Format base units to human-readable string.
 * e.g., 1050n USD → "10.50"
 */
export function formatBaseUnits(
  baseUnits: bigint,
  currency: SupportedCurrency,
): string {
  const multiplier = MULTIPLIERS[currency];
  const decimals = DECIMALS[currency];

  const intPart = baseUnits / multiplier;
  const fracPart = baseUnits % multiplier;

  const fracStr = fracPart.toString().padStart(decimals, '0');
  return `${intPart}.${fracStr}`;
}

/**
 * Format as display string with currency symbol.
 * e.g., 1050n USD → "$10.50"
 */
export function formatCurrency(
  baseUnits: bigint,
  currency: SupportedCurrency,
): string {
  const symbols: Record<SupportedCurrency, string> = {
    USD: '$',
    USDT: 'USDT ',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR ',
    AED: 'AED ',
    NIM: 'NIM ',
  };
  return `${symbols[currency]}${formatBaseUnits(baseUnits, currency)}`;
}

// ─── Split Contributions ──────────────────────────────────────────────────────

export interface SplitResult {
  shares: bigint[];      // Per-member share in base units
  total: bigint;         // Sum of all shares (may differ from target by 1 unit due to rounding)
  remainder: bigint;     // target - total (0 or very small)
}

/**
 * Split a total amount fairly among N members.
 * Handles rounding: the last member gets any remainder unit(s).
 * Uses ONLY integer arithmetic.
 */
export function splitEqually(
  totalBaseUnits: bigint,
  memberCount: number,
): SplitResult {
  if (memberCount <= 0) {
    throw new ValidationError('Member count must be at least 1');
  }
  if (totalBaseUnits <= 0n) {
    throw new ValidationError('Total amount must be greater than zero');
  }

  const count = BigInt(memberCount);
  const baseShare = totalBaseUnits / count;
  const remainder = totalBaseUnits % count;

  // Distribute remainder: give 1 extra unit to first N-remainder members
  const shares: bigint[] = [];
  for (let i = 0; i < memberCount; i++) {
    shares.push(baseShare + (BigInt(i) < remainder ? 1n : 0n));
  }

  const total = shares.reduce((acc, s) => acc + s, 0n);

  return { shares, total, remainder: totalBaseUnits - total };
}

/**
 * Calculate how much each unpaid member needs to contribute to close the gap.
 * Deterministic — AI only explains the result, never computes it.
 */
export interface ContributionOptimization {
  remainingAmount: bigint;
  unpaidMemberCount: number;
  suggestedShares: { memberId: string; amountBaseUnits: bigint }[];
  explanation: string;
  currency: SupportedCurrency;
}

export function optimizeContributions(
  targetBaseUnits: bigint,
  collectedBaseUnits: bigint,
  unpaidMembers: { id: string }[],
  currency: SupportedCurrency,
): ContributionOptimization {
  if (collectedBaseUnits >= targetBaseUnits) {
    return {
      remainingAmount: 0n,
      unpaidMemberCount: unpaidMembers.length,
      suggestedShares: unpaidMembers.map(m => ({ memberId: m.id, amountBaseUnits: 0n })),
      explanation: 'The goal has already been reached.',
      currency,
    };
  }

  const remainingAmount = targetBaseUnits - collectedBaseUnits;

  if (unpaidMembers.length === 0) {
    return {
      remainingAmount,
      unpaidMemberCount: 0,
      suggestedShares: [],
      explanation: `There are ${formatCurrency(remainingAmount, currency)} remaining but no unpaid members.`,
      currency,
    };
  }

  const { shares } = splitEqually(remainingAmount, unpaidMembers.length);

  const suggestedShares = unpaidMembers.map((m, i) => ({
    memberId: m.id,
    amountBaseUnits: shares[i],
  }));

  const explanation =
    `To reach the goal, ${unpaidMembers.length} member(s) need to contribute a total of ` +
    `${formatCurrency(remainingAmount, currency)}. ` +
    `Each member's share: ${formatCurrency(shares[0], currency)}` +
    (shares[0] !== shares[shares.length - 1]
      ? ` (last member: ${formatCurrency(shares[shares.length - 1], currency)} due to rounding)`
      : '') +
    '.';

  return { remainingAmount, unpaidMemberCount: unpaidMembers.length, suggestedShares, explanation, currency };
}

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Strict equality — never approximate */
export function amountsMatch(a: bigint, b: bigint): boolean {
  return a === b;
}

/** Check if amount is within allowed tolerance (0 for crypto) */
export function isAmountAcceptable(
  expected: bigint,
  actual: bigint,
  toleranceCents = 0n,
): boolean {
  const diff = actual - expected;
  const absDiff = diff < 0n ? -diff : diff;
  return absDiff <= toleranceCents;
}
