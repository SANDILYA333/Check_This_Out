import type { Language, TargetId } from '../../guidance/types.ts';
import type { AmazonOrderOutcome, PageObservation, SiteAdapter } from '../adapters/types.ts';
import { evaluateAmazonOrderOutcome } from '../adapters/amazonConfirmationEvaluator.ts';

export type AmazonGuidanceIntent =
  | 'GUIDE_CART'
  | 'GUIDE_ADDRESS_SELECTION'
  | 'GUIDE_PAYMENT_SELECTION'
  | 'GUIDE_ORDER_REVIEW'
  | 'PAUSED_EMPTY_CART'
  | 'PAUSED_AUTH_REQUIRED'
  | 'PAUSED_SECURITY_CHALLENGE'
  | 'PAUSED_UNVERIFIED'
  | 'PAUSED_UNSUPPORTED'
  | 'OUTCOME_CONFIRMED'
  | 'OUTCOME_UNCONFIRMED'
  | 'OUTCOME_PENDING'
  | 'OUTCOME_FAILED';

export interface AmazonGuidanceState {
  readonly intent: AmazonGuidanceIntent;
  readonly targetId: TargetId | null;
  readonly language: Language;
  readonly stepNumber?: number;
  readonly totalSteps?: number;
  readonly isWaitingForPageUpdate: boolean;
  readonly unverifiedReason?: string;
  readonly outcome?: AmazonOrderOutcome;
}

/**
 * Deterministically maps a verified Amazon PageObservation and AmazonOrderOutcome to a guidance intent.
 * Invariant: Page and outcome evidence drives guidance; user actions never advance state alone.
 */
export function mapObservationToIntent(
  observation: PageObservation,
  outcome?: AmazonOrderOutcome,
  isWaitingAfterReview?: boolean
): {
  readonly intent: AmazonGuidanceIntent;
  readonly targetId: TargetId | null;
  readonly stepNumber?: number;
  readonly totalSteps?: number;
  readonly unverifiedReason?: string;
  readonly outcome?: AmazonOrderOutcome;
} {
  // 1. Explicit confirmed order placement
  if (outcome?.status === 'CONFIRMED') {
    return {
      intent: 'OUTCOME_CONFIRMED',
      targetId: null,
      outcome,
    };
  }

  // 2. Explicit pending / processing state (intermediate payment, UPI pending)
  if (outcome?.status === 'PENDING') {
    return {
      intent: 'OUTCOME_PENDING',
      targetId: null,
      outcome,
    };
  }

  // 3. Explicit verified failure state
  if (outcome?.status === 'FAILED') {
    return {
      intent: 'OUTCOME_FAILED',
      targetId: null,
      outcome,
    };
  }

  // 4. Confirmation page with unconfirmed outcome
  if (observation.pageState === 'ORDER_CONFIRMATION') {
    return {
      intent: 'OUTCOME_UNCONFIRMED',
      targetId: null,
      outcome,
      unverifiedReason:
        outcome?.status === 'UNCONFIRMED' ? outcome.reason : observation.unverifiedReason,
    };
  }

  // 5. Post-review transition where outcome could not be verified
  if (isWaitingAfterReview && outcome?.status === 'UNCONFIRMED') {
    return {
      intent: 'OUTCOME_UNCONFIRMED',
      targetId: null,
      outcome,
      unverifiedReason: outcome.reason,
    };
  }

  // 6. Security challenge / CAPTCHA interruption
  if (observation.pageState === 'SECURITY_CHALLENGE') {
    return {
      intent: 'PAUSED_SECURITY_CHALLENGE',
      targetId: null,
      outcome,
    };
  }

  // 7. Authentication gate interruption
  if (observation.pageState === 'AUTH_REQUIRED') {
    return {
      intent: 'PAUSED_AUTH_REQUIRED',
      targetId: null,
      outcome,
    };
  }

  // 8. Empty cart interruption
  if (observation.pageState === 'EMPTY_CART') {
    return {
      intent: 'PAUSED_EMPTY_CART',
      targetId: null,
      outcome,
    };
  }

  // 9. Unsupported site or non-checkout page
  if (!observation.supported && observation.siteId === 'unsupported') {
    return {
      intent: 'PAUSED_UNSUPPORTED',
      targetId: null,
      outcome,
      unverifiedReason: observation.unverifiedReason,
    };
  }

  // 10. Standard active checkout guidance stages
  switch (observation.pageState) {
    case 'CART':
      return {
        intent: 'GUIDE_CART',
        targetId: 'amazon-proceed-to-buy',
        stepNumber: 1,
        totalSteps: 4,
        outcome,
      };

    case 'ADDRESS_SELECTION':
      return {
        intent: 'GUIDE_ADDRESS_SELECTION',
        targetId: 'amazon-select-address',
        stepNumber: 2,
        totalSteps: 4,
        outcome,
      };

    case 'PAYMENT_SELECTION':
      return {
        intent: 'GUIDE_PAYMENT_SELECTION',
        targetId: 'amazon-select-payment',
        stepNumber: 3,
        totalSteps: 4,
        outcome,
      };

    case 'ORDER_REVIEW':
      return {
        intent: 'GUIDE_ORDER_REVIEW',
        targetId: 'amazon-place-order',
        stepNumber: 4,
        totalSteps: 4,
        outcome,
      };

    case 'UNVERIFIED':
      return {
        intent: 'PAUSED_UNVERIFIED',
        targetId: null,
        outcome,
        unverifiedReason: observation.unverifiedReason,
      };

    case 'UNSUPPORTED':
    default:
      return {
        intent: 'PAUSED_UNSUPPORTED',
        targetId: null,
        outcome,
        unverifiedReason: observation.unverifiedReason,
      };
  }
}

/**
 * AmazonGuidanceController: Deterministic guidance controller for Amazon India checkout.
 *
 * Guarantees:
 * 1. Read-only and non-actuating: never triggers clicks or submissions.
 * 2. Driven strictly by verified PageObservation and AmazonOrderOutcome evidence.
 * 3. Never advances state purely from user clicks: requires page evidence to confirm transition.
 * 4. Zero mock payment coordination: entirely isolated from simulated payment services.
 */
export class AmazonGuidanceController {
  private adapter: SiteAdapter;
  private state: AmazonGuidanceState;
  private listeners: Set<(state: AmazonGuidanceState) => void> = new Set();
  private lastObservation: PageObservation | null = null;
  private wasWaitingOnReview: boolean = false;

  constructor(adapter: SiteAdapter, initialLanguage: Language = 'en', doc?: Document | null) {
    this.adapter = adapter;
    const initialDoc = doc ?? (typeof document !== 'undefined' ? document : null);
    const observation = this.adapter.observePageState(initialDoc);
    const outcome = evaluateAmazonOrderOutcome(initialDoc);
    this.lastObservation = observation;
    const mapped = mapObservationToIntent(observation, outcome);

    this.state = {
      intent: mapped.intent,
      targetId: mapped.targetId,
      language: initialLanguage,
      stepNumber: mapped.stepNumber,
      totalSteps: mapped.totalSteps,
      isWaitingForPageUpdate: false,
      unverifiedReason: mapped.unverifiedReason,
      outcome: mapped.outcome,
    };
  }

  public getState(): AmazonGuidanceState {
    return this.state;
  }

  public setLanguage(language: Language): void {
    if (this.state.language === language) return;
    this.state = {
      ...this.state,
      language,
    };
    this.notifyListeners();
  }

  /**
   * Re-evaluates page observation and updates guidance intent when the underlying DOM changes.
   */
  public handlePageUpdate(doc?: Document | null): void {
    const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);
    const observation = this.adapter.observePageState(targetDoc);
    const outcome = evaluateAmazonOrderOutcome(targetDoc);
    const previousIntent = this.state.intent;

    const isWaitingAfterReview =
      this.wasWaitingOnReview && observation.pageState !== 'ORDER_REVIEW';

    const mapped = mapObservationToIntent(observation, outcome, isWaitingAfterReview);

    const intentChanged = mapped.intent !== previousIntent;
    const observationChanged = observation.pageState !== this.lastObservation?.pageState;
    const outcomeChanged = outcome.status !== this.state.outcome?.status;

    this.lastObservation = observation;

    if (observation.pageState !== 'ORDER_REVIEW') {
      this.wasWaitingOnReview = false;
    }

    if (intentChanged || observationChanged || outcomeChanged) {
      this.state = {
        intent: mapped.intent,
        targetId: mapped.targetId,
        language: this.state.language,
        stepNumber: mapped.stepNumber,
        totalSteps: mapped.totalSteps,
        isWaitingForPageUpdate: false, // Reset waiting flag when genuine page transition occurs
        unverifiedReason: mapped.unverifiedReason,
        outcome: mapped.outcome,
      };
      this.notifyListeners();
    }
  }

  /**
   * Called when a manual user interaction with a verified target is observed.
   * Sets waiting status without advancing the checkout step until page evidence verifies transition.
   */
  public notifyUserAction(): void {
    if (this.state.isWaitingForPageUpdate) return;
    if (this.state.intent === 'GUIDE_ORDER_REVIEW') {
      this.wasWaitingOnReview = true;
    }
    this.state = {
      ...this.state,
      isWaitingForPageUpdate: true,
    };
    this.notifyListeners();
  }

  public subscribe(listener: (state: AmazonGuidanceState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public destroy(): void {
    this.listeners.clear();
  }
}
