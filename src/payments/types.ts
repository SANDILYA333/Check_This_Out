/**
 * Core type definitions for VoiceCheckout simulated payment service and coordinator.
 * Pure TypeScript, zero external payment libraries, no network calls.
 */

export interface Transaction {
  readonly transactionId: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export const SUPPORTED_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending',
  'success',
  'failed',
] as const;

export function isPaymentStatus(status: unknown): status is PaymentStatus {
  return typeof status === 'string' && (SUPPORTED_PAYMENT_STATUSES as readonly string[]).includes(status);
}

export type PaymentScenario =
  | 'immediate_success'
  | 'immediate_failure'
  | 'pending_then_success'
  | 'pending_then_failure'
  | 'remains_pending'
  | 'unknown_transaction'
  | 'status_error'
  | 'unexpected_status';

export interface MockPaymentService {
  createOrder(): Promise<Transaction>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
  setScenario(scenario: PaymentScenario): void;
  getScenario(): PaymentScenario;
  reset(): void;
}

export interface TransactionCreationResult {
  readonly ok: boolean;
  readonly transactionId?: string;
  readonly error?: string;
}

export interface PaymentResolutionResult {
  readonly ok: boolean;
  readonly status?: PaymentStatus;
  readonly error?: string;
}
