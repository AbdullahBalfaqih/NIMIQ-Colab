/**
 * Payment Provider Interface
 * Abstraction layer — allows swapping Nimiq for other providers without
 * changing the rest of the application.
 */

export interface VerificationResult {
  valid: boolean;
  txHash: string;
  senderAddress: string;
  recipientAddress: string;
  amountBaseUnits: bigint;
  currency: string;
  blockHeight?: number;
  confirmations: number;
  timestamp?: Date;
  rawData?: Record<string, unknown>;
  failureReason?: string;
}

export interface PaymentProvider {
  /**
   * Verify a transaction on the blockchain.
   * Returns structured result — backend decides acceptance.
   */
  verifyTransaction(txHash: string, network: string): Promise<VerificationResult>;

  /**
   * Check if a transaction is final (enough confirmations).
   */
  isTransactionFinal(txHash: string, network: string): Promise<boolean>;

  /**
   * Get current block height.
   */
  getCurrentBlockHeight(network: string): Promise<number>;
}
