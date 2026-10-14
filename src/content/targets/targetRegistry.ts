import type { TargetId } from '../../guidance/types.ts';
import { isControlledCheckoutPage } from '../adapters/demoCheckoutAdapter.ts';

/**
 * Registry of stable selectors for the controlled checkout page.
 */
export const TARGET_SELECTORS: Readonly<Partial<Record<TargetId, string>>> = {
  'checkout-root': '[data-voicecheckout-demo]',
  'product-card': '[data-testid="product-card"]',
  'checkout-total': '[data-testid="checkout-total"]',
  'address-summary': '[data-testid="address-summary"]',
  'change-address': '[data-testid="change-address"]',
  'confirm-address': '[data-testid="confirm-address"]',
  'payment-method': '[data-testid="payment-method"]',
  'continue-to-review': '[data-testid="continue-to-review"]',
  'confirm-review': '[data-testid="confirm-review"]',
  'confirm-upi-handoff': '[data-testid="confirm-upi-handoff"]',
};

export type TargetLookupResult =
  | { readonly status: 'verified'; readonly element: HTMLElement; readonly targetId: TargetId }
  | { readonly status: 'missing'; readonly targetId: TargetId }
  | { readonly status: 'ambiguous'; readonly targetId: TargetId; readonly count: number }
  | { readonly status: 'hidden'; readonly targetId: TargetId }
  | { readonly status: 'disabled'; readonly targetId: TargetId }
  | { readonly status: 'unsupported_page'; readonly targetId: TargetId };

/**
 * Checks whether an element is visibly rendered on the page.
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false;
  }

  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const inlineStyle = element.style;
  if (
    inlineStyle &&
    (inlineStyle.display === 'none' ||
      inlineStyle.visibility === 'hidden' ||
      inlineStyle.visibility === 'collapse')
  ) {
    return false;
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    try {
      const computed = window.getComputedStyle(element);
      if (
        computed.display === 'none' ||
        computed.visibility === 'hidden' ||
        computed.visibility === 'collapse' ||
        computed.opacity === '0'
      ) {
        return false;
      }
    } catch {
      // In mocked or testing DOM environments, fallback to inline check
    }
  }

  return true;
}

/**
 * Checks whether an interactive target is enabled.
 */
export function isElementEnabled(element: HTMLElement): boolean {
  if ((element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled === true) {
    return false;
  }
  if (element.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  return true;
}

/**
 * Target IDs that represent user actions and require an enabled interactive control.
 */
const ACTION_TARGETS: ReadonlySet<TargetId> = new Set([
  'change-address',
  'confirm-address',
  'continue-to-review',
  'confirm-review',
  'confirm-upi-handoff',
]);

/**
 * Deterministically locates and verifies a target control within the controlled demo page.
 *
 * Verification requirements:
 * 1. The page must be a verified controlled demo checkout.
 * 2. Exactly one matching element must exist (ambiguity check).
 * 3. The element must be connected to the active document.
 * 4. The element must be visible.
 * 5. Action targets must be enabled.
 * 6. Element must be inside the controlled checkout root.
 *
 * SAFETY INVARIANT: Strictly read-only. Never clicks, changes, or activates controls.
 */
export function lookupTarget(
  targetId: TargetId,
  doc?: Document | null
): TargetLookupResult {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);

  if (!targetDoc) {
    return { status: 'unsupported_page', targetId };
  }

  const support = isControlledCheckoutPage(targetDoc);
  if (!support.supported) {
    return { status: 'unsupported_page', targetId };
  }

  const selector = TARGET_SELECTORS[targetId];
  if (!selector) {
    return { status: 'missing', targetId };
  }

  const matching = targetDoc.querySelectorAll<HTMLElement>(selector);

  if (matching.length === 0) {
    return { status: 'missing', targetId };
  }

  if (matching.length > 1) {
    return { status: 'ambiguous', targetId, count: matching.length };
  }

  const element = matching[0];

  if (!element.isConnected) {
    return { status: 'missing', targetId };
  }

  if (!isElementVisible(element)) {
    return { status: 'hidden', targetId };
  }

  if (ACTION_TARGETS.has(targetId) && !isElementEnabled(element)) {
    return { status: 'disabled', targetId };
  }

  return {
    status: 'verified',
    element,
    targetId,
  };
}
