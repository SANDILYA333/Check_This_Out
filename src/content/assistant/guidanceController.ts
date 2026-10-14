import type {
  CheckoutAction,
  CheckoutState,
  Language,
  TransitionResult,
} from '../../guidance/types.ts';
import { createInitialState } from '../../guidance/initialState.ts';
import { transition } from '../../guidance/transitionEngine.ts';

export type StateChangeListener = (state: CheckoutState) => void;

/**
 * Controller managing active checkout state for the on-page assistant.
 * Thin reactive wrapper around the deterministic Phase 1 guidance transition engine.
 */
export class GuidanceController {
  private currentState: CheckoutState;
  private listeners: Set<StateChangeListener> = new Set();
  private lastError: string | null = null;

  constructor(initialLanguage: Language = 'en') {
    this.currentState = createInitialState(initialLanguage);
  }

  public getState(): CheckoutState {
    return this.currentState;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public clearLastError(): void {
    this.lastError = null;
  }

  /**
   * Dispatches a checkout action through the Phase 1 transition engine.
   * If accepted, notifies all subscribers.
   * If rejected, stores the rejection reason and preserves state.
   */
  public dispatch(action: CheckoutAction): TransitionResult {
    const result = transition(this.currentState, action);

    if (result.ok) {
      this.currentState = result.state;
      this.lastError = null;
      this.notifyListeners();
    } else {
      this.lastError = result.error;
    }

    return result;
  }

  /**
   * Subscribes a listener to checkout state changes.
   * Returns an unsubscribe callback.
   */
  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Resets the controller and clears listeners.
   */
  public destroy(): void {
    this.listeners.clear();
    this.lastError = null;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('Error in guidance state listener:', err);
      }
    }
  }
}
