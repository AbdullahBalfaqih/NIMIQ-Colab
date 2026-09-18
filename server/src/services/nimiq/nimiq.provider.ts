import type { PaymentProvider, VerificationResult } from './payment.provider';

/**
 * Nimiq Payment Provider
 *
 * Connects to Nimiq RPC to verify blockchain transactions.
 * In testnet/demo mode (when RPC is unavailable), uses simulation.
 *
 * IMPORTANT: Never trusts client-provided payment status.
 * Always queries the blockchain independently.
 */
export class NimiqPaymentProvider implements PaymentProvider {
  private readonly rpcUrl: string;
  private readonly network: string;
  private readonly minConfirmations: number;

  constructor() {
    this.rpcUrl = process.env.NIMIQ_RPC_URL ?? 'wss://rpc-testnet.nimiq.network';
    this.network = process.env.NIMIQ_NETWORK ?? 'testnet';
    this.minConfirmations = parseInt(process.env.NIMIQ_MIN_CONFIRMATIONS ?? '2', 10);
  }

  async verifyTransaction(txHash: string, network: string): Promise<VerificationResult> {
    try {
      // Normalize and validate txHash format
      const normalizedHash = this.normalizeTxHash(txHash);

      // In demo/testnet mode when RPC is not configured, use simulation
      if (this.rpcUrl.includes('rpc-testnet.nimiq.network')) {
        return await this.fetchFromNimiqRpc(normalizedHash, network);
      }

      return await this.fetchFromNimiqRpc(normalizedHash, network);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        txHash,
        senderAddress: '',
        recipientAddress: '',
        amountBaseUnits: 0n,
        currency: 'NIM',
        confirmations: 0,
        failureReason: `RPC verification failed: ${message}`,
      };
    }
  }

  private async fetchFromNimiqRpc(txHash: string, _network: string): Promise<VerificationResult> {
    /**
     * Nimiq JSON-RPC v2 call: getTransactionByHash
     * Documentation: https://nimiq.com/developers/build/rpc-docs/
     */
    const response = await fetch(this.rpcUrl.replace('wss://', 'https://').replace('ws://', 'http://'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP error: ${response.status}`);
    }

    const data = await response.json() as {
      result?: {
        hash: string;
        sender: string;
        recipient: string;
        value: number; // Luna
        blockNumber?: number;
        confirmations?: number;
        timestamp?: number;
      };
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.result) {
      return {
        valid: false,
        txHash,
        senderAddress: '',
        recipientAddress: '',
        amountBaseUnits: 0n,
        currency: 'NIM',
        confirmations: 0,
        failureReason: 'Transaction not found on blockchain',
      };
    }

    const tx = data.result;
    const confirmations = tx.confirmations ?? 0;

    return {
      valid: confirmations >= this.minConfirmations,
      txHash: tx.hash,
      senderAddress: tx.sender,
      recipientAddress: tx.recipient,
      amountBaseUnits: BigInt(Math.round(tx.value)), // Already in Luna
      currency: 'NIM',
      blockHeight: tx.blockNumber,
      confirmations,
      timestamp: tx.timestamp ? new Date(tx.timestamp * 1000) : undefined,
      rawData: tx as Record<string, unknown>,
      failureReason: confirmations < this.minConfirmations
        ? `Insufficient confirmations: ${confirmations}/${this.minConfirmations}`
        : undefined,
    };
  }

  async isTransactionFinal(txHash: string, network: string): Promise<boolean> {
    const result = await this.verifyTransaction(txHash, network);
    return result.valid && result.confirmations >= this.minConfirmations;
  }

  async getCurrentBlockHeight(_network: string): Promise<number> {
    try {
      const response = await fetch(
        this.rpcUrl.replace('wss://', 'https://').replace('ws://', 'http://'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getBlockNumber',
            params: [],
            id: 1,
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );
      const data = await response.json() as { result?: number };
      return data.result ?? 0;
    } catch {
      return 0;
    }
  }

  private normalizeTxHash(hash: string): string {
    // Nimiq tx hashes are 64-char hex strings
    const cleaned = hash.trim().toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-f]{64}$/.test(cleaned)) {
      throw new Error(`Invalid Nimiq transaction hash format: ${hash}`);
    }
    return cleaned;
  }
}

// Singleton instance
let _provider: NimiqPaymentProvider | null = null;

export function getNimiqProvider(): NimiqPaymentProvider {
  if (!_provider) {
    _provider = new NimiqPaymentProvider();
  }
  return _provider;
}
