import type { GuidanceController } from '../content/assistant/guidanceController.ts';
import type {
  MockPaymentService,
  PaymentResolutionResult,
  TransactionCreationResult,
} from './types.ts';
import { isPaymentStatus } from './types.ts';

export interface PaymentCoordinatorOptions {
  controller: GuidanceController;
  service: MockPaymentService;
}

/**
 * Coordinates payment lifecycle between the deterministic MockPaymentService
 * and the GuidanceController state machine.
 *
 * Enforces all Phase 4 safety invariants:
 * 1. Exactly-once order creation per confirmed review attempt (in-flight guard).
 * 2. Explicit UPI handoff confirmation before status retrieval begins.
 * 3. Status checks reuse the existing transaction ID (never calls createOrder() during check).
 * 4. Stale-result protection: results for old or discarded transactions cannot mutate state.
 * 5. Runtime boundary validation: unhandled or invalid statuses remain unresolved.
 * 6. Status-check errors do not fabricate success or failure.
 * 7. Retry is allowed strictly from confirmed FAILED stage, returning to METHOD.
 */
export class PaymentCoordinator {
  private controller: GuidanceController;
  private service: MockPaymentService;
  private isCreatingOrder: boolean = false;
  private isResolvingStatus: boolean = false;
  private lastCoordinatorError: string | null = null;

  constructor(options: PaymentCoordinatorOptions) {
    this.controller = options.controller;
    this.service = options.service;
  }

  public getService(): MockPaymentService {
    return this.service;
  }

  public getLastError(): string | null {
    return this.lastCoordinatorError;
  }

  public clearLastError(): void {
    this.lastCoordinatorError = null;
  }

  public isBusy(): boolean {
    return this.isCreatingOrder || this.isResolvingStatus;
  }

  /**
   * Confirms the REVIEW stage by creating a mock transaction exactly once
   * and advancing to UPI_SIMULATION.
   */
  public async confirmReview(): Promise<TransactionCreationResult> {
    const currentState = this.controller.getState();

    // 1. Stage verification
    if (currentState.stage !== 'REVIEW') {
      const err = `Cannot confirm review from stage "${currentState.stage}".`;
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    // 2. In-flight creation guard against rapid double-clicks
    if (this.isCreatingOrder) {
      return { ok: false, error: 'Order creation already in-flight.' };
    }

    this.isCreatingOrder = true;
    this.lastCoordinatorError = null;

    try {
      // 3. Create mock order
      const transaction = await this.service.createOrder();

      if (!transaction || !transaction.transactionId || transaction.transactionId.trim().length === 0) {
        throw new Error('Service returned an invalid or empty transaction ID.');
      }

      // 4. Pass transaction ID to the guidance transition engine
      const res = this.controller.dispatch({
        type: 'CONFIRM_REVIEW',
        transactionId: transaction.transactionId,
      });

      if (!res.ok) {
        this.lastCoordinatorError = res.error;
        return { ok: false, error: res.error };
      }

      return { ok: true, transactionId: transaction.transactionId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create mock order.';
      this.lastCoordinatorError = message;
      return { ok: false, error: message };
    } finally {
      this.isCreatingOrder = false;
    }
  }

  /**
   * Confirms simulated UPI handoff, advancing from UPI_SIMULATION to PROCESSING,
   * and deterministically initiates status retrieval.
   */
  public async confirmUpiHandoff(): Promise<PaymentResolutionResult> {
    const currentState = this.controller.getState();

    if (currentState.stage !== 'UPI_SIMULATION') {
      const err = `Cannot confirm UPI handoff from stage "${currentState.stage}".`;
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    if (!currentState.transactionId) {
      const err = 'Cannot enter processing without an active transaction ID.';
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    if (this.isResolvingStatus) {
      return { ok: false, error: 'Payment processing is already in-flight.' };
    }

    const activeTxnId = currentState.transactionId;

    // Transition to PROCESSING
    const transitionRes = this.controller.dispatch({ type: 'CONFIRM_UPI_HANDOFF' });
    if (!transitionRes.ok) {
      this.lastCoordinatorError = transitionRes.error;
      return { ok: false, error: transitionRes.error };
    }

    return this.resolveStatus(activeTxnId);
  }

  /**
   * Rechecks a pending transaction reusing the existing transaction ID.
   * Does NOT call createOrder().
   */
  public async recheckPendingStatus(): Promise<PaymentResolutionResult> {
    const currentState = this.controller.getState();

    if (currentState.stage !== 'PENDING') {
      const err = `Cannot recheck status from non-pending stage "${currentState.stage}".`;
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    if (!currentState.transactionId) {
      const err = 'Missing active transaction ID in PENDING stage.';
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    if (this.isResolvingStatus) {
      return { ok: false, error: 'Status check is already in-flight.' };
    }

    return this.resolveStatus(currentState.transactionId);
  }

  /**
   * Retries payment after confirmed failure. Returns to METHOD.
   */
  public retry(): { ok: boolean; error?: string } {
    const currentState = this.controller.getState();

    if (currentState.stage !== 'FAILED') {
      const err = `Retry is prohibited from stage "${currentState.stage}". Only confirmed FAILED payments can be retried.`;
      this.lastCoordinatorError = err;
      return { ok: false, error: err };
    }

    const res = this.controller.dispatch({ type: 'RETRY' });
    if (res.ok) {
      this.lastCoordinatorError = null;
      return { ok: true };
    } else {
      this.lastCoordinatorError = res.error;
      return { ok: false, error: res.error };
    }
  }

  /**
   * Resolves payment status from the mock service for a given transaction ID.
   * Enforces stale-check invalidation, runtime boundary validation, and error containment.
   */
  private async resolveStatus(transactionId: string): Promise<PaymentResolutionResult> {
    this.isResolvingStatus = true;
    this.lastCoordinatorError = null;

    try {
      // 1. Call mock payment service
      const rawStatus = await this.service.getStatus(transactionId);

      // 2. Stale-result protection check:
      // Verify that the assistant has not navigated away or cancelled this transaction
      const stateAfterCheck = this.controller.getState();
      if (
        stateAfterCheck.transactionId !== transactionId ||
        (stateAfterCheck.stage !== 'PROCESSING' && stateAfterCheck.stage !== 'PENDING')
      ) {
        // Discard stale result safely
        return {
          ok: false,
          error: `Discarded stale status result for transaction "${transactionId}".`,
        };
      }

      // 3. Runtime boundary validation: verify status is an allowed enum member
      if (!isPaymentStatus(rawStatus)) {
        const errorMsg = `Unexpected status value received: "${String(rawStatus)}". Status remains unresolved.`;
        this.lastCoordinatorError = errorMsg;
        return { ok: false, error: errorMsg };
      }

      // 4. Dispatch explicit event based on validated status
      switch (rawStatus) {
        case 'success': {
          const res = this.controller.dispatch({ type: 'PAYMENT_SUCCESS' });
          if (!res.ok) {
            this.lastCoordinatorError = res.error;
            return { ok: false, error: res.error };
          }
          return { ok: true, status: 'success' };
        }

        case 'failed': {
          const res = this.controller.dispatch({ type: 'PAYMENT_FAILURE' });
          if (!res.ok) {
            this.lastCoordinatorError = res.error;
            return { ok: false, error: res.error };
          }
          return { ok: true, status: 'failed' };
        }

        case 'pending': {
          const res = this.controller.dispatch({ type: 'PAYMENT_PENDING' });
          if (!res.ok) {
            this.lastCoordinatorError = res.error;
            return { ok: false, error: res.error };
          }
          return { ok: true, status: 'pending' };
        }
      }
    } catch (err) {
      // Status-check error: catch and contain, leaving transaction unresolved
      const message =
        err instanceof Error ? err.message : 'Error retrieving payment status.';
      this.lastCoordinatorError = message;
      return { ok: false, error: message };
    } finally {
      this.isResolvingStatus = false;
    }
  }
}
