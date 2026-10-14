import type {
  PageObservation,
  PageSupportResult,
  ShopSpherePageState,
  SiteAdapter,
  SiteId,
} from './types.ts';
import type { TargetId } from '../../guidance/types.ts';
import {
  isElementEnabled,
  isElementVisible,
  type TargetLookupResult,
} from '../targets/targetRegistry.ts';
import type { GuidanceController } from '../assistant/guidanceController.ts';
import { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';
import { mockPaymentService } from '../../payments/mockPaymentService.ts';

export const SHOPSPHERE_STORE_ATTR = 'data-vc-store';

/**
 * Deterministically checks whether the provided Document is the ShopSphere Demo Store.
 *
 * Invariants:
 * - Read-only: never triggers controls or alters DOM.
 * - Checks for stable ShopSphere marker or root container.
 * - Explicitly rejects Amazon and the legacy simple demo.
 */
export function isShopSphereDocument(doc?: Document | null): PageSupportResult {
  if (!doc || !doc.body) {
    return { supported: false, reason: 'missing_document' };
  }

  // Reject legacy simple demo
  if (doc.body.hasAttribute('data-voicecheckout-demo')) {
    return { supported: false, reason: 'unsupported_page' };
  }

  // Reject Amazon URLs or roots
  const url = doc.location?.href || '';
  if (url.includes('amazon.in')) {
    return { supported: false, reason: 'unsupported_hostname' };
  }

  // Check for ShopSphere store marker on body or element
  const hasStoreAttr =
    doc.body.getAttribute(SHOPSPHERE_STORE_ATTR) === 'shopsphere' ||
    doc.querySelector(`[${SHOPSPHERE_STORE_ATTR}="shopsphere"]`) !== null;

  const hasStoreRoot =
    doc.getElementById('shopsphere-root') !== null ||
    doc.querySelector('[data-vc-page]') !== null;

  if (!hasStoreAttr && !hasStoreRoot) {
    return { supported: false, reason: 'missing_marker' };
  }

  return { supported: true, siteId: 'shopsphere-demo' };
}

const SHOPSPHERE_TARGET_CONFIG: Record<string, readonly string[]> = {
  'hero-shop': ['[data-vc-target="hero-shop"]'],
  'product-search': ['[data-vc-target="product-search"]'],
  'product-card-add': ['[data-vc-target="product-card-add"]'],
  'view-details': ['[data-vc-target="view-details"]'],
  'cart-icon': ['[data-vc-target="cart-icon"]'],
  'add-to-cart': ['[data-vc-target="add-to-cart"]'],
  'proceed-to-checkout': ['[data-vc-target="proceed-to-checkout"]'],
  'proceed-checkout': ['[data-vc-target="proceed-to-checkout"]'],
  'confirm-address': ['[data-vc-target="confirm-address"]', '[data-vc-target="select-address"]'],
  'select-address': ['[data-vc-target="confirm-address"]', '[data-vc-target="select-address"]'],
  'confirm-delivery': ['[data-vc-target="confirm-delivery"]', '[data-vc-target="select-delivery"]'],
  'select-delivery': ['[data-vc-target="confirm-delivery"]', '[data-vc-target="select-delivery"]'],
  'confirm-payment-method': ['[data-vc-target="confirm-payment-method"]', '[data-vc-target="select-payment"]'],
  'select-payment': ['[data-vc-target="confirm-payment-method"]', '[data-vc-target="select-payment"]'],
  'confirm-order-review': ['[data-vc-target="confirm-order-review"]', '[data-vc-target="review-continue"]'],
  'review-continue': ['[data-vc-target="confirm-order-review"]', '[data-vc-target="review-continue"]'],
  'simulate-payment-random': ['[data-vc-target="simulate-payment-random"]', '[data-vc-target="simulate-payment-success"]'],
  'simulate-payment-success': ['[data-vc-target="simulate-payment-random"]', '[data-vc-target="simulate-payment-success"]'],
  'simulate-payment-fail': ['[data-vc-target="simulate-payment-fail"]'],
  'simulate-payment-pending': ['[data-vc-target="simulate-payment-pending"]'],
  'simulate-payment-unconfirmed': ['[data-vc-target="simulate-payment-unconfirmed"]'],
  'continue-shopping': ['[data-vc-target="continue-shopping"]'],
  'retry-payment': ['[data-vc-target="retry-payment"]'],
  'recheck-status': ['[data-vc-target="recheck-status"]'],
};

export class ShopSphereCheckoutAdapter implements SiteAdapter {
  readonly siteId: SiteId = 'shopsphere-demo';
  readonly name: string = 'ShopSphere Demo Store';

  public detectPage(doc?: Document | null): PageSupportResult {
    const res = isShopSphereDocument(doc);
    return {
      supported: res.supported,
      siteId: res.supported ? 'shopsphere-demo' : undefined,
      reason: res.reason,
    };
  }

  public observePageState(doc?: Document | null): PageObservation {
    const detection = this.detectPage(doc);
    if (!detection.supported || !doc) {
      return {
        supported: false,
        siteId: 'unsupported',
        unverifiedReason: detection.reason,
      };
    }

    const pageAttr =
      doc.body.getAttribute('data-vc-page') ||
      doc.querySelector('[data-vc-page]')?.getAttribute('data-vc-page');

    const stateAttr =
      doc.body.getAttribute('data-vc-state') ||
      doc.querySelector('[data-vc-state]')?.getAttribute('data-vc-state');

    let pageState: ShopSpherePageState = 'LANDING';

    switch (pageAttr) {
      case 'landing':
        pageState = 'LANDING';
        break;
      case 'product-detail':
      case 'product_detail':
        pageState = 'PRODUCT_DETAILS';
        break;
      case 'cart':
        pageState = stateAttr === 'empty' ? 'EMPTY_CART' : 'CART';
        break;
      case 'address':
      case 'checkout_address':
        pageState = 'ADDRESS_SELECTION';
        break;
      case 'delivery':
      case 'checkout_delivery':
        pageState = 'DELIVERY_SELECTION';
        break;
      case 'payment':
      case 'checkout_payment':
        pageState = 'PAYMENT_SELECTION';
        break;
      case 'review':
      case 'checkout_review':
        pageState = 'ORDER_REVIEW';
        break;
      case 'demo-payment':
      case 'checkout_demo_payment':
        pageState = 'DEMO_PAYMENT';
        break;
      case 'order-result':
      case 'order_result':
        if (stateAttr === 'confirmed') pageState = 'ORDER_CONFIRMED';
        else if (stateAttr === 'failed') pageState = 'PAYMENT_FAILED';
        else if (stateAttr === 'pending') pageState = 'PAYMENT_PENDING';
        else if (stateAttr === 'unconfirmed') pageState = 'RESULT_UNCONFIRMED';
        else pageState = 'ORDER_CONFIRMED';
        break;
      default:
        pageState = 'LANDING';
    }

    return {
      supported: true,
      siteId: 'shopsphere-demo',
      pageState,
    };
  }

  public lookupTarget(targetId: TargetId, doc?: Document | null): TargetLookupResult {
    if (!doc) {
      return { status: 'unsupported_page', targetId };
    }

    const selectors = SHOPSPHERE_TARGET_CONFIG[targetId] ?? [`[data-vc-target="${targetId}"]`];
    const matchedElements: HTMLElement[] = [];

    for (const sel of selectors) {
      try {
        const elements = Array.from(doc.querySelectorAll<HTMLElement>(sel));
        for (const el of elements) {
          if (!matchedElements.includes(el)) {
            matchedElements.push(el);
          }
        }
      } catch {
        // Ignore invalid selectors
      }
    }

    if (matchedElements.length === 0) {
      return { status: 'missing', targetId };
    }

    // Filter connected elements
    const connectedElements = matchedElements.filter((el) => el.isConnected);
    if (connectedElements.length === 0) {
      return { status: 'missing', targetId };
    }

    // Filter visible elements
    const visibleElements = connectedElements.filter((el) => isElementVisible(el));
    if (visibleElements.length === 0) {
      return { status: 'hidden', targetId };
    }

    // Ambiguity check: if multiple distinct targets match, never guess!
    if (visibleElements.length > 1) {
      return { status: 'ambiguous', targetId, count: visibleElements.length };
    }

    const targetElement = visibleElements[0];

    // Enabled check
    if (!isElementEnabled(targetElement)) {
      return { status: 'disabled', targetId };
    }

    return { status: 'verified', element: targetElement, targetId };
  }

  public createPaymentCoordinator(controller: GuidanceController): PaymentCoordinator {
    return new PaymentCoordinator({
      controller,
      service: mockPaymentService,
    });
  }

  public dispose(): void {
    // Adapter maintains no long-lived global listeners
  }
}

export const shopsphereCheckoutAdapter = new ShopSphereCheckoutAdapter();
