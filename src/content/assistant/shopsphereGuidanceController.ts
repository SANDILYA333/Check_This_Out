import type { Language, TargetId } from '../../guidance/types.ts';
import type { ShopSpherePageState, SiteAdapter } from '../adapters/types.ts';
import type { MessageKey } from '../../localization/types.ts';

export type ShopSphereGuidanceIntent =
  | 'GUIDE_LANDING'
  | 'GUIDE_PRODUCT_DETAILS'
  | 'GUIDE_CART'
  | 'GUIDE_ADDRESS'
  | 'GUIDE_DELIVERY'
  | 'GUIDE_PAYMENT'
  | 'GUIDE_REVIEW'
  | 'GUIDE_DEMO_PAYMENT'
  | 'OUTCOME_CONFIRMED'
  | 'OUTCOME_FAILED'
  | 'OUTCOME_PENDING'
  | 'OUTCOME_UNCONFIRMED'
  | 'PAUSED_EMPTY_CART';

export interface ShopSphereGuidanceState {
  readonly intent: ShopSphereGuidanceIntent;
  readonly pageState: ShopSpherePageState;
  readonly instructionKey: MessageKey;
  readonly targetId: TargetId | null;
  readonly language: Language;
  readonly stepNumber?: number;
  readonly totalSteps?: number;
}

export interface IntentMapping {
  readonly intent: ShopSphereGuidanceIntent;
  readonly instructionKey: MessageKey;
  readonly targetId: TargetId | null;
  readonly stepNumber?: number;
  readonly totalSteps?: number;
}

export function mapShopSphereStateToIntent(state: ShopSpherePageState): IntentMapping {
  switch (state) {
    case 'LANDING':
      return {
        intent: 'GUIDE_LANDING',
        instructionKey: 'shopsphere_landing_instruction',
        targetId: 'hero-shop' as TargetId,
      };
    case 'PRODUCT_DETAILS':
      return {
        intent: 'GUIDE_PRODUCT_DETAILS',
        instructionKey: 'shopsphere_product_instruction',
        targetId: 'add-to-cart' as TargetId,
      };
    case 'CART':
      return {
        intent: 'GUIDE_CART',
        instructionKey: 'shopsphere_cart_instruction',
        targetId: 'proceed-to-checkout' as TargetId,
        stepNumber: 1,
        totalSteps: 6,
      };
    case 'EMPTY_CART':
      return {
        intent: 'PAUSED_EMPTY_CART',
        instructionKey: 'shopsphere_empty_cart_instruction',
        targetId: 'continue-shopping' as TargetId,
      };
    case 'ADDRESS_SELECTION':
      return {
        intent: 'GUIDE_ADDRESS',
        instructionKey: 'shopsphere_address_instruction',
        targetId: 'confirm-address' as TargetId,
        stepNumber: 2,
        totalSteps: 6,
      };
    case 'DELIVERY_SELECTION':
      return {
        intent: 'GUIDE_DELIVERY',
        instructionKey: 'shopsphere_delivery_instruction',
        targetId: 'confirm-delivery' as TargetId,
        stepNumber: 3,
        totalSteps: 6,
      };
    case 'PAYMENT_SELECTION':
      return {
        intent: 'GUIDE_PAYMENT',
        instructionKey: 'shopsphere_payment_instruction',
        targetId: 'confirm-payment-method' as TargetId,
        stepNumber: 4,
        totalSteps: 6,
      };
    case 'ORDER_REVIEW':
      return {
        intent: 'GUIDE_REVIEW',
        instructionKey: 'shopsphere_review_instruction',
        targetId: 'confirm-order-review' as TargetId,
        stepNumber: 5,
        totalSteps: 6,
      };
    case 'DEMO_PAYMENT':
      return {
        intent: 'GUIDE_DEMO_PAYMENT',
        instructionKey: 'shopsphere_demo_payment_instruction',
        targetId: 'simulate-payment-success' as TargetId,
        stepNumber: 6,
        totalSteps: 6,
      };
    case 'ORDER_CONFIRMED':
      return {
        intent: 'OUTCOME_CONFIRMED',
        instructionKey: 'shopsphere_confirmed_instruction',
        targetId: 'continue-shopping' as TargetId,
      };
    case 'PAYMENT_FAILED':
      return {
        intent: 'OUTCOME_FAILED',
        instructionKey: 'shopsphere_failed_instruction',
        targetId: 'retry-payment' as TargetId,
      };
    case 'PAYMENT_PENDING':
      return {
        intent: 'OUTCOME_PENDING',
        instructionKey: 'shopsphere_pending_instruction',
        targetId: 'recheck-status' as TargetId,
      };
    case 'RESULT_UNCONFIRMED':
      return {
        intent: 'OUTCOME_UNCONFIRMED',
        instructionKey: 'shopsphere_unconfirmed_instruction',
        targetId: 'continue-shopping' as TargetId,
      };
    default:
      return {
        intent: 'GUIDE_LANDING',
        instructionKey: 'shopsphere_landing_instruction',
        targetId: 'hero-shop' as TargetId,
      };
  }
}

export type ShopSphereSubscriber = (state: ShopSphereGuidanceState) => void;

export class ShopSphereGuidanceController {
  private adapter: SiteAdapter;
  private state: ShopSphereGuidanceState;
  private subscribers: Set<ShopSphereSubscriber> = new Set();
  private doc: Document | null;

  constructor(adapter: SiteAdapter, initialLanguage: Language = 'en', doc?: Document | null) {
    this.adapter = adapter;
    this.doc = doc ?? (typeof document !== 'undefined' ? document : null);

    const docLang = (this.doc?.body?.getAttribute('data-vc-lang') as Language) || initialLanguage;
    const initialLang = ['en', 'hi', 'te'].includes(docLang) ? docLang : initialLanguage;

    const initialObs = this.adapter.observePageState(this.doc);
    const initialPageState = (initialObs.pageState as ShopSpherePageState) || 'LANDING';
    const mapping = mapShopSphereStateToIntent(initialPageState);

    this.state = {
      intent: mapping.intent,
      pageState: initialPageState,
      instructionKey: mapping.instructionKey,
      targetId: mapping.targetId,
      language: initialLang,
      stepNumber: mapping.stepNumber,
      totalSteps: mapping.totalSteps,
    };
  }

  public getState(): ShopSphereGuidanceState {
    return this.state;
  }

  public subscribe(listener: ShopSphereSubscriber): () => void {
    this.subscribers.add(listener);
    listener(this.state);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.subscribers) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error notifying ShopSphere guidance subscriber:', err);
      }
    }
  }

  public setLanguage(lang: Language): void {
    if (this.state.language === lang) return;
    this.state = {
      ...this.state,
      language: lang,
    };
    this.notify();
  }

  public updatePageState(newPageState: ShopSpherePageState): void {
    if (this.state.pageState === newPageState) return;
    const mapping = mapShopSphereStateToIntent(newPageState);
    this.state = {
      ...this.state,
      intent: mapping.intent,
      pageState: newPageState,
      instructionKey: mapping.instructionKey,
      targetId: mapping.targetId,
      stepNumber: mapping.stepNumber,
      totalSteps: mapping.totalSteps,
    };
    this.notify();
  }

  public reevaluate(): void {
    const obs = this.adapter.observePageState(this.doc);
    if (obs.supported && obs.pageState) {
      this.updatePageState(obs.pageState as ShopSpherePageState);
    }
  }

  public destroy(): void {
    this.subscribers.clear();
  }
}
