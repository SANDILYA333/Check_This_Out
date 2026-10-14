import type { CheckoutStage, TargetId } from './types.ts';

/**
 * Maps each canonical checkout stage to its primary expected target element.
 */
export const STAGE_TARGET_MAP: Readonly<Record<CheckoutStage, TargetId | null>> = {
  WELCOME: null,
  LANGUAGE: null,
  ADDRESS: 'confirm-address',
  ADDRESS_CHANGE_STUB: 'change-address',
  METHOD: 'payment-method',
  REVIEW: 'confirm-review',
  UPI_SIMULATION: 'confirm-upi-handoff',
  PROCESSING: null,
  SUCCESS: null,
  FAILED: null,
  PENDING: null,
  UNSUPPORTED: null,
};

let transactionCounter = 0;

/**
 * Deterministic mock transaction ID generator for the REVIEW confirmation boundary.
 * In production or Phase 4, MockPsp will provide the transaction ID.
 */
export function generateMockTransactionId(): string {
  transactionCounter += 1;
  const timestamp = Date.now().toString(36);
  const sequence = transactionCounter.toString(36).padStart(4, '0');
  return `vc_txn_${timestamp}_${sequence}`;
}

/**
 * Reset internal transaction counter (for testing idempotency).
 */
export function resetTransactionCounter(): void {
  transactionCounter = 0;
}
