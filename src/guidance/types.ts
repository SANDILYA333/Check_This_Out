export type CheckoutStage =
  | 'WELCOME'
  | 'LANGUAGE'
  | 'ADDRESS'
  | 'ADDRESS_CHANGE_STUB'
  | 'METHOD'
  | 'REVIEW'
  | 'UPI_SIMULATION'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING'
  | 'UNSUPPORTED';

export type Language = 'te' | 'hi' | 'en';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['te', 'hi', 'en'] as const;

export function isSupportedLanguage(lang: unknown): lang is Language {
  return typeof lang === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

export type PaymentStatus =
  | 'none'
  | 'unresolved'
  | 'pending'
  | 'success'
  | 'failed'
  | 'unknown';

export type TargetId =
  | 'checkout-root'
  | 'product-card'
  | 'checkout-total'
  | 'address-summary'
  | 'change-address'
  | 'confirm-address'
  | 'payment-method'
  | 'continue-to-review'
  | 'confirm-review'
  | 'confirm-upi-handoff'
  | 'amazon-proceed-to-buy'
  | 'amazon-select-address'
  | 'amazon-select-payment'
  | 'amazon-place-order';

/**
 * Strict checkout state representation.
 * Invariant: paymentStatus === 'success' or 'pending' or 'failed' or 'unresolved' requires a non-null transactionId.
 */
export interface CheckoutState {
  readonly stage: CheckoutStage;
  readonly language: Language;
  readonly targetId: TargetId | null;
  readonly transactionId: string | null;
  readonly paymentStatus: PaymentStatus;
}

export type CheckoutAction =
  | { readonly type: 'START_ASSISTANCE' }
  | { readonly type: 'SELECT_LANGUAGE'; readonly language: Language }
  | { readonly type: 'SWITCH_LANGUAGE'; readonly language: Language }
  | { readonly type: 'CONFIRM_ADDRESS' }
  | { readonly type: 'REQUEST_ADDRESS_CHANGE' }
  | { readonly type: 'CONTINUE_TO_REVIEW' }
  | { readonly type: 'CONFIRM_REVIEW'; readonly transactionId?: string }
  | { readonly type: 'CONFIRM_UPI_HANDOFF' }
  | { readonly type: 'PAYMENT_SUCCESS' }
  | { readonly type: 'PAYMENT_FAILURE' }
  | { readonly type: 'PAYMENT_PENDING' }
  | { readonly type: 'RETRY' }
  | { readonly type: 'BACK' }
  | { readonly type: 'MARK_UNSUPPORTED' }
  | { readonly type: 'RESET' };

export type TransitionResult =
  | { readonly ok: true; readonly state: CheckoutState }
  | { readonly ok: false; readonly error: string; readonly state: CheckoutState };
