import type { GuidanceController } from './guidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import type { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';

export interface ActionObserverOptions {
  controller: GuidanceController;
  highlighter: TargetHighlighter;
  doc?: Document;
  coordinator?: PaymentCoordinator;
}

/**
 * Observes user interactions on the controlled demo page, validates expected state,
 * and coordinates transitions without ever programmatically clicking or submitting controls.
 *
 * Invariants:
 * 1. User performs the action: strictly listens, never triggers clicks.
 * 2. Prevents double-advancement and race conditions via state gating.
 * 3. Scoped lifecycle: inactive when assistant is closed.
 * 4. All document listeners removed on disconnect().
 */
export class ActionObserver {
  private controller: GuidanceController;
  private highlighter: TargetHighlighter;
  private doc: Document;
  private coordinator?: PaymentCoordinator;
  private isActive: boolean = true;
  private isTransitioning: boolean = false;
  private clickListener: ((event: MouseEvent) => void) | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(options: ActionObserverOptions) {
    this.controller = options.controller;
    this.highlighter = options.highlighter;
    this.doc = options.doc ?? (typeof document !== 'undefined' ? document : ({} as Document));
    this.coordinator = options.coordinator;

    this.attachListeners();
  }

  private attachListeners(): void {
    if (!this.doc || typeof this.doc.addEventListener !== 'function') {
      return;
    }

    this.clickListener = (event: MouseEvent) => {
      if (!this.isActive || this.isTransitioning) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') {
        return;
      }

      const state = this.controller.getState();

      // Stage-specific user action handling
      switch (state.stage) {
        case 'ADDRESS': {
          if (target.closest('[data-testid="confirm-address"]')) {
            this.handleUserAction(() => {
              this.controller.dispatch({ type: 'CONFIRM_ADDRESS' });
            });
          } else if (target.closest('[data-testid="change-address"]')) {
            this.handleUserAction(() => {
              this.controller.dispatch({ type: 'REQUEST_ADDRESS_CHANGE' });
            });
          }
          break;
        }

        case 'METHOD': {
          if (target.closest('[data-testid="continue-to-review"]')) {
            this.handleUserAction(() => {
              this.controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
            });
          }
          break;
        }

        case 'REVIEW': {
          if (target.closest('[data-testid="confirm-review"]')) {
            this.handleUserAction(() => {
              if (this.coordinator) {
                return this.coordinator.confirmReview();
              }
              return this.controller.dispatch({ type: 'CONFIRM_REVIEW' });
            });
          }
          break;
        }

        case 'UPI_SIMULATION': {
          if (target.closest('[data-testid="confirm-upi-handoff"]')) {
            this.handleUserAction(() => {
              if (this.coordinator) {
                return this.coordinator.confirmUpiHandoff();
              }
              return this.controller.dispatch({ type: 'CONFIRM_UPI_HANDOFF' });
            });
          }
          break;
        }

        default:
          break;
      }
    };

    this.doc.addEventListener('click', this.clickListener, true);

    // Dynamic target revalidation on DOM mutations
    if (typeof MutationObserver !== 'undefined' && this.doc.body) {
      this.mutationObserver = new MutationObserver(() => {
        if (!this.isActive) return;
        const currentTargetId = this.controller.getState().targetId;
        this.highlighter.update(currentTargetId, this.doc);
      });

      this.mutationObserver.observe(this.doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'style', 'aria-disabled'],
      });
    }
  }

  private handleUserAction(transitionFn: () => unknown): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    let isPromise = false;
    try {
      const res = transitionFn();
      if (res && typeof (res as Promise<unknown>).then === 'function') {
        isPromise = true;
        (res as Promise<unknown>).finally(() => {
          this.isTransitioning = false;
          const newState = this.controller.getState();
          this.highlighter.update(newState.targetId, this.doc);
        });
      } else {
        // Synchronous update
        const newState = this.controller.getState();
        this.highlighter.update(newState.targetId, this.doc);
      }
    } finally {
      if (!isPromise) {
        this.isTransitioning = false;
      }
    }
  }

  public disconnect(): void {
    this.isActive = false;

    if (this.clickListener && typeof this.doc.removeEventListener === 'function') {
      this.doc.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}
