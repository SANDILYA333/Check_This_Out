import type {
  MockPaymentService,
  PaymentScenario,
  PaymentStatus,
  Transaction,
} from './types.ts';

interface InternalTransactionRecord {
  readonly transactionId: string;
  checkCount: number;
  readonly scenarioAtCreation: PaymentScenario;
}

/**
 * Deterministic local in-memory mock payment service.
 * Enforces payment safety invariants:
 * - Local-only: zero network requests, no external payment SDKs or endpoints.
 * - Credential-free: zero collection or storage of PINs, OTPs, or passwords.
 * - Order creation != success: createOrder() returns a transaction identifier only.
 * - Idempotent status retrieval: getStatus() operates on existing transactions without creating new ones.
 * - Deterministic scenario progression: check counts track multi-step resolutions (e.g. pending then success).
 */
export class DeterministicMockPaymentService implements MockPaymentService {
  private activeScenario: PaymentScenario = 'pending_then_success';
  private transactions: Map<string, InternalTransactionRecord> = new Map();
  private counter: number = 0;

  constructor(defaultScenario: PaymentScenario = 'pending_then_success') {
    this.activeScenario = defaultScenario;
  }

  /**
   * Sets the deterministic scenario for subsequent payment simulations.
   */
  public setScenario(scenario: PaymentScenario): void {
    this.activeScenario = scenario;
  }

  /**
   * Returns the currently configured simulation scenario.
   */
  public getScenario(): PaymentScenario {
    return this.activeScenario;
  }

  /**
   * Creates one local mock transaction.
   * Returns a unique transaction ID.
   * Never mutates UI or advances checkout state.
   */
  public async createOrder(): Promise<Transaction> {
    this.counter += 1;
    const timestamp = Date.now().toString(36);
    const sequence = this.counter.toString(36).padStart(4, '0');
    const transactionId = `mock_order_${timestamp}_${sequence}`;

    const record: InternalTransactionRecord = {
      transactionId,
      checkCount: 0,
      scenarioAtCreation: this.activeScenario,
    };

    this.transactions.set(transactionId, record);

    return { transactionId };
  }

  /**
   * Deterministically retrieves the status for an existing mock transaction.
   * Operates only on the specified transaction ID; never creates a new transaction.
   */
  public async getStatus(transactionId: string): Promise<PaymentStatus> {
    // Safety check: scenario-forced unknown transaction
    if (this.activeScenario === 'unknown_transaction') {
      throw new Error(`Unknown transaction ID: "${transactionId}"`);
    }

    // Safety check: scenario-forced status check retrieval error
    if (this.activeScenario === 'status_error') {
      throw new Error('Simulated payment service communication error');
    }

    // Validate that transaction exists in local registry
    const record = this.transactions.get(transactionId);
    if (!record) {
      throw new Error(`Unknown transaction ID: "${transactionId}"`);
    }

    record.checkCount += 1;
    const currentScenario = this.activeScenario;

    switch (currentScenario) {
      case 'immediate_success':
        return 'success';

      case 'immediate_failure':
        return 'failed';

      case 'pending_then_success':
        return record.checkCount === 1 ? 'pending' : 'success';

      case 'pending_then_failure':
        return record.checkCount === 1 ? 'pending' : 'failed';

      case 'remains_pending':
        return 'pending';

      case 'unexpected_status':
        // Simulates an invalid/unexpected status string Crossing runtime boundary
        return 'unexpected_value_from_service' as unknown as PaymentStatus;

      default: {
        const _exhaustive: never = currentScenario;
        throw new Error(`Unhandled scenario: "${String(_exhaustive)}"`);
      }
    }
  }

  /**
   * Resets all internal mock transaction records and counters.
   */
  public reset(): void {
    this.transactions.clear();
    this.counter = 0;
  }

  /**
   * Returns the count of status checks performed for a specific transaction ID.
   * Used for deterministic inspection in automated tests.
   */
  public getCheckCount(transactionId: string): number {
    return this.transactions.get(transactionId)?.checkCount ?? 0;
  }

  /**
   * Returns whether a transaction exists in the registry.
   */
  public hasTransaction(transactionId: string): boolean {
    return this.transactions.has(transactionId);
  }
}

/**
 * Singleton mock payment service instance for application-level demonstration.
 */
export const mockPaymentService = new DeterministicMockPaymentService();
