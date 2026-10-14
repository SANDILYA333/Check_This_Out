import type { CheckoutState, Language } from './types.ts';

export function createInitialState(language: Language = 'en'): CheckoutState {
  return {
    stage: 'WELCOME',
    language,
    targetId: null,
    transactionId: null,
    paymentStatus: 'none',
  };
}
