import { CheckoutState, Language } from '../../guidance/types.ts';

export type ExtensionRequestMessage =
  | { readonly type: 'START_ASSISTANCE'; readonly language?: Language }
  | { readonly type: 'STOP_ASSISTANCE' }
  | { readonly type: 'GET_CHECKOUT_STATE' };

export type ExtensionResponseMessage =
  | { readonly supported: boolean; readonly state?: CheckoutState; readonly error?: string }
  | { readonly stopped: boolean };

export function isExtensionRequest(message: unknown): message is ExtensionRequestMessage {
  if (!message || typeof message !== 'object') return false;
  const type = (message as { type?: unknown }).type;
  return (
    type === 'START_ASSISTANCE' ||
    type === 'STOP_ASSISTANCE' ||
    type === 'GET_CHECKOUT_STATE'
  );
}
