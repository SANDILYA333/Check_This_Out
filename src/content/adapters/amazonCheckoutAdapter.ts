import type {
  AmazonPageState,
  PageObservation,
  PageSupportResult,
  SiteAdapter,
  SiteId,
} from './types.ts';
import type { TargetId } from '../../guidance/types.ts';
import {
  isElementEnabled,
  isElementVisible,
  type TargetLookupResult,
} from '../targets/targetRegistry.ts';

const AMAZON_TARGET_CONFIG: Record<
  string,
  {
    expectedState: AmazonPageState;
    selectors: readonly string[];
  }
> = {
  'amazon-proceed-to-buy': {
    expectedState: 'CART',
    selectors: [
      'input[name="proceedToRetailCheckout"]',
      '[data-feature-id="proceed-to-checkout-action"]',
      '#sc-buy-box-ptc-button input',
      '#sc-buy-box-ptc-button',
      'a[name="proceedToRetailCheckout"]',
    ],
  },
  'amazon-select-address': {
    expectedState: 'ADDRESS_SELECTION',
    selectors: [
      '[data-testid="Address_selectShipToThisAddress"]',
      '#shipToThisAddressButton',
      'input[value="Use this address"]',
      'input[value="Deliver to this address"]',
      'input[name="order0"]',
    ],
  },
  'confirm-address': {
    expectedState: 'ADDRESS_SELECTION',
    selectors: [
      '[data-testid="Address_selectShipToThisAddress"]',
      '#shipToThisAddressButton',
      'input[value="Use this address"]',
      'input[value="Deliver to this address"]',
      'input[name="order0"]',
    ],
  },
  'amazon-select-payment': {
    expectedState: 'PAYMENT_SELECTION',
    selectors: [
      'input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]',
      '[data-testid="payment-continue-button"]',
      '#pp-select-payment-method input[type="submit"]',
      'input[value="Use this payment method"]',
    ],
  },
  'continue-to-review': {
    expectedState: 'PAYMENT_SELECTION',
    selectors: [
      'input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]',
      '[data-testid="payment-continue-button"]',
      '#pp-select-payment-method input[type="submit"]',
      'input[value="Use this payment method"]',
    ],
  },
  'amazon-place-order': {
    expectedState: 'ORDER_REVIEW',
    selectors: [
      'input[name="placeYourOrder1"]',
      '[data-testid="spc-place-order"]',
      '#bottomSubmitOrderButtonId input[type="submit"]',
      '#placeYourOrder input[type="submit"]',
    ],
  },
  'confirm-review': {
    expectedState: 'ORDER_REVIEW',
    selectors: [
      'input[name="placeYourOrder1"]',
      '[data-testid="spc-place-order"]',
      '#bottomSubmitOrderButtonId input[type="submit"]',
      '#placeYourOrder input[type="submit"]',
    ],
  },
};

function isSensitiveElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input') {
    const inputType = (element.getAttribute('type') || '').toLowerCase();
    if (inputType === 'password' || inputType === 'hidden') {
      return true;
    }
  }

  const nameAttr = (element.getAttribute('name') || '').toLowerCase();
  const idAttr = (element.getAttribute('id') || '').toLowerCase();
  const sensitiveTokens = ['password', 'otp', 'pin', 'cvv', 'card', 'account', 'secret'];
  return sensitiveTokens.some((tok) => nameAttr.includes(tok) || idAttr.includes(tok));
}

/**
 * Extracts a normalized URL object from the provided document.
 * Safely inspects document.location, document.URL, or global window.location.
 * Never modifies the document URL.
 */
export function extractDocumentUrl(doc?: Document | null): URL | null {
  if (!doc) {
    return null;
  }

  try {
    if (doc.location && typeof doc.location.href === 'string' && doc.location.href.length > 0) {
      return new URL(doc.location.href);
    }
    if ((doc as { URL?: string }).URL && typeof (doc as { URL?: string }).URL === 'string') {
      return new URL((doc as { URL?: string }).URL!);
    }
    if (typeof window !== 'undefined' && window.location?.href) {
      return new URL(window.location.href);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Helper to safely query presence of an element using a CSS selector.
 * Strictly read-only: never reads values or triggers events.
 */
function hasElement(doc: Document, selector: string): boolean {
  try {
    return doc.querySelector(selector) !== null;
  } catch {
    return false;
  }
}

/**
 * Candidate DOM selectors for each checkout state on www.amazon.in.
 * Note: These are candidate markers derived from technical discovery.
 * Live production markup may vary across A/B tests and layouts.
 */
const SELECTORS = {
  SECURITY_CHALLENGE: [
    'form[action*="validateCaptcha"]',
    '#captchacharacters',
    '#auth-mfa-form',
    'input#auth-mfa-otpcode',
    '[data-testid="security-challenge-container"]',
  ],
  AUTH: [
    '#ap_signin_form',
    'form[name="signIn"]',
    '#signInSubmit',
    'input#ap_email',
    '[data-testid="auth-signin-form"]',
  ],
  EMPTY_CART: [
    '#sc-empty-cart',
    '[data-name="sc-empty-cart"]',
    '[data-testid="sc-empty-cart"]',
  ],
  ACTIVE_CART: [
    'input[name="proceedToRetailCheckout"]',
    '[data-feature-id="proceed-to-checkout-action"]',
    '#sc-buy-box-ptc-button',
    '#activeCartViewForm',
  ],
  ADDRESS: [
    '[data-testid="Address_selectShipToThisAddress"]',
    '#shipToThisAddressButton',
    'input[name="order0"]',
    'input[value="Use this address"]',
    '#address-book-entry-0',
    '#address-selection',
  ],
  PAYMENT: [
    'input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]',
    '#payselectForm',
    '#payment-information',
    '[data-testid="payment-method-selector"]',
    '#pp-select-payment-method',
  ],
  REVIEW: [
    'input[name="placeYourOrder1"]',
    '#bottomSubmitOrderButtonId',
    '#subtotals-marketplace-table',
    '[data-testid="spc-place-order"]',
    '#spc-orders',
  ],
  CONFIRMATION: [
    '#thankYouPage',
    '[data-testid="order-placed-confirmation"]',
    '#header-order-placed',
    '.thank-you-page',
  ],
};

function matchesAny(doc: Document, selectors: readonly string[]): boolean {
  return selectors.some((sel) => hasElement(doc, sel));
}

/**
 * AmazonCheckoutAdapter: Read-only site adapter for Amazon India (www.amazon.in).
 *
 * Safety Invariants:
 * 1. Strictly read-only: never calls .click(), .submit(), or dispatches synthetic events.
 * 2. Zero credential collection: never queries or reads passwords, OTPs, PINs, card details, or CVVs.
 * 3. Zero PII collection: does not extract names, physical addresses, order totals, or order IDs.
 * 4. Fails safe: returns UNVERIFIED on ambiguous or missing markers; returns UNSUPPORTED on non-checkout pages.
 * 5. Isolated from mock payment: does NOT implement createPaymentCoordinator.
 */
export class AmazonCheckoutAdapter implements SiteAdapter {
  readonly siteId: SiteId = 'amazon_in';
  readonly name: string = 'Amazon India Checkout';

  /**
   * Strictly evaluates whether the document belongs to www.amazon.in and represents
   * a supported, verified checkout stage.
   */
  public detectPage(doc?: Document | null): PageSupportResult {
    if (!doc) {
      return { supported: false, reason: 'missing_document' };
    }

    const url = extractDocumentUrl(doc);
    if (!url) {
      return { supported: false, reason: 'missing_url' };
    }

    // Hostname validation: strictly www.amazon.in
    if (url.hostname !== 'www.amazon.in') {
      return { supported: false, reason: 'unsupported_hostname' };
    }

    const observation = this.observePageState(doc);

    // Supported checkout states
    switch (observation.pageState) {
      case 'CART':
      case 'ADDRESS_SELECTION':
      case 'PAYMENT_SELECTION':
      case 'ORDER_REVIEW':
      case 'ORDER_CONFIRMATION':
      case 'EMPTY_CART':
      case 'AUTH_REQUIRED':
      case 'SECURITY_CHALLENGE':
        return { supported: true, siteId: 'amazon_in' };

      case 'UNVERIFIED':
        return {
          supported: false,
          siteId: 'amazon_in',
          reason: 'unverified_page_state',
        };

      case 'UNSUPPORTED':
      default:
        return {
          supported: false,
          siteId: 'amazon_in',
          reason: 'unsupported_amazon_page',
        };
    }
  }

  /**
   * Classifies the current Amazon India page state based on conservative URL-path
   * and non-sensitive DOM structure signals.
   */
  public observePageState(doc?: Document | null): PageObservation {
    if (!doc) {
      return {
        supported: false,
        siteId: 'unsupported',
        unverifiedReason: 'missing_document',
      };
    }

    const url = extractDocumentUrl(doc);
    if (!url) {
      return {
        supported: false,
        siteId: 'unsupported',
        unverifiedReason: 'missing_url',
      };
    }

    if (url.hostname !== 'www.amazon.in') {
      return {
        supported: false,
        siteId: 'unsupported',
        pageState: 'UNSUPPORTED',
        unverifiedReason: `Unsupported hostname: "${url.hostname}"`,
      };
    }

    const pathname = url.pathname.toLowerCase();

    // 1. Security Challenge / CAPTCHA (can interrupt any step on Amazon)
    const isCaptchaUrl =
      pathname.includes('/errors/validatecaptcha') || pathname.includes('/captcha');
    const hasCaptchaDom = matchesAny(doc, SELECTORS.SECURITY_CHALLENGE);

    if (isCaptchaUrl || hasCaptchaDom) {
      return {
        supported: true,
        siteId: 'amazon_in',
        pageState: 'SECURITY_CHALLENGE',
      };
    }

    // 2. Authentication Required / Sign-in Gate
    const isAuthUrl =
      pathname.startsWith('/ap/signin') ||
      pathname.startsWith('/ap/register') ||
      pathname.includes('/signin');
    const hasAuthDom = matchesAny(doc, SELECTORS.AUTH);

    if (isAuthUrl || hasAuthDom) {
      return {
        supported: true,
        siteId: 'amazon_in',
        pageState: 'AUTH_REQUIRED',
      };
    }

    // 3. Cart Page
    const isCartUrl =
      pathname === '/cart' || pathname.startsWith('/cart/') || pathname.startsWith('/gp/cart');

    if (isCartUrl) {
      const hasEmptyCart = matchesAny(doc, SELECTORS.EMPTY_CART);
      const hasActiveCart = matchesAny(doc, SELECTORS.ACTIVE_CART);

      // Check for conflict: both empty cart and active proceed button present
      if (hasEmptyCart && hasActiveCart) {
        return {
          supported: false,
          siteId: 'amazon_in',
          pageState: 'UNVERIFIED',
          unverifiedReason: 'Conflicting cart DOM signals (both active and empty markers present)',
        };
      }

      // Check for conflict with other checkout stages
      if (matchesAny(doc, SELECTORS.CONFIRMATION) || matchesAny(doc, SELECTORS.REVIEW)) {
        return {
          supported: false,
          siteId: 'amazon_in',
          pageState: 'UNVERIFIED',
          unverifiedReason: 'URL and DOM conflict (cart URL with checkout/confirmation markers)',
        };
      }

      if (hasEmptyCart) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'EMPTY_CART',
        };
      }

      if (hasActiveCart) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'CART',
        };
      }

      // On cart URL but neither empty nor active proceed button found (e.g. loading or unverified layout)
      return {
        supported: false,
        siteId: 'amazon_in',
        pageState: 'UNVERIFIED',
        unverifiedReason: 'Cart page missing verified proceed or empty-cart control',
      };
    }

    // 4. Delivery Address Selection
    const isAddressUrl =
      pathname.startsWith('/gp/buy/addressselect') || pathname.includes('/addressselect');

    if (isAddressUrl) {
      if (matchesAny(doc, SELECTORS.CONFIRMATION)) {
        return {
          supported: false,
          siteId: 'amazon_in',
          pageState: 'UNVERIFIED',
          unverifiedReason: 'URL and DOM conflict (address URL with confirmation marker)',
        };
      }

      if (matchesAny(doc, SELECTORS.ADDRESS)) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'ADDRESS_SELECTION',
        };
      }

      return {
        supported: false,
        siteId: 'amazon_in',
        pageState: 'UNVERIFIED',
        unverifiedReason: 'Address page missing expected address selection controls',
      };
    }

    // 5. Payment Method Selection
    const isPaymentUrl =
      pathname.startsWith('/gp/buy/payselect') || pathname.includes('/payselect');

    if (isPaymentUrl) {
      if (matchesAny(doc, SELECTORS.CONFIRMATION)) {
        return {
          supported: false,
          siteId: 'amazon_in',
          pageState: 'UNVERIFIED',
          unverifiedReason: 'URL and DOM conflict (payment URL with confirmation marker)',
        };
      }

      if (matchesAny(doc, SELECTORS.PAYMENT)) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'PAYMENT_SELECTION',
        };
      }

      return {
        supported: false,
        siteId: 'amazon_in',
        pageState: 'UNVERIFIED',
        unverifiedReason: 'Payment page missing expected payment selection controls',
      };
    }

    // 6. Order Review (Single-Page Checkout / SPC)
    const isReviewUrl = pathname.startsWith('/gp/buy/spc') || pathname.includes('/spc');

    if (isReviewUrl) {
      if (matchesAny(doc, SELECTORS.CONFIRMATION)) {
        return {
          supported: false,
          siteId: 'amazon_in',
          pageState: 'UNVERIFIED',
          unverifiedReason: 'URL and DOM conflict (review URL with confirmation marker)',
        };
      }

      if (matchesAny(doc, SELECTORS.REVIEW)) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'ORDER_REVIEW',
        };
      }

      return {
        supported: false,
        siteId: 'amazon_in',
        pageState: 'UNVERIFIED',
        unverifiedReason: 'Review page missing expected order summary or place-order controls',
      };
    }

    // 7. Order Confirmation ("Thank You" Page)
    const isConfirmationUrl =
      pathname.startsWith('/gp/buy/thankyou') ||
      pathname.includes('/thankyou') ||
      pathname.startsWith('/checkout/thankyou');

    if (isConfirmationUrl) {
      if (matchesAny(doc, SELECTORS.CONFIRMATION)) {
        return {
          supported: true,
          siteId: 'amazon_in',
          pageState: 'ORDER_CONFIRMATION',
        };
      }

      // Ambiguous: on thankyou URL but missing confirmation container
      return {
        supported: false,
        siteId: 'amazon_in',
        pageState: 'UNVERIFIED',
        unverifiedReason: 'Confirmation URL without verified order confirmation banner',
      };
    }

    // 8. Non-checkout Amazon pages (product detail, search, account, etc.)
    return {
      supported: false,
      siteId: 'amazon_in',
      pageState: 'UNSUPPORTED',
      unverifiedReason: `Non-checkout Amazon page route: "${pathname}"`,
    };
  }

  /**
   * Resolves and verifies an Amazon checkout target control within the document.
   *
   * Verification criteria:
   * 1. Page must be www.amazon.in in the expected checkout state.
   * 2. Exactly one matching element must exist (ambiguity check).
   * 3. Element must be connected, visible, and enabled.
   * 4. Element must not be inert or a sensitive credential/secret field.
   * 5. Returns 'unsupported_page' if page state does not match or is in auth/challenge/unverified.
   * 6. Strictly read-only: never triggers clicks or mutates controls.
   */
  public lookupTarget(targetId: TargetId, doc?: Document | null): TargetLookupResult {
    const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);
    if (!targetDoc) {
      return { status: 'unsupported_page', targetId };
    }

    const url = extractDocumentUrl(targetDoc);
    if (!url || url.hostname !== 'www.amazon.in') {
      return { status: 'unsupported_page', targetId };
    }

    const config = AMAZON_TARGET_CONFIG[targetId];
    if (!config) {
      return { status: 'unsupported_page', targetId };
    }

    const observation = this.observePageState(targetDoc);
    if (observation.pageState !== config.expectedState) {
      return { status: 'unsupported_page', targetId };
    }

    // Query candidate selectors
    let matchedElement: HTMLElement | null = null;
    let foundMultiple = false;
    let totalCount = 0;

    for (const selector of config.selectors) {
      let elements: NodeListOf<HTMLElement>;
      try {
        elements = targetDoc.querySelectorAll<HTMLElement>(selector);
      } catch {
        continue;
      }

      if (elements.length > 1) {
        foundMultiple = true;
        totalCount = elements.length;
        break;
      }

      if (elements.length === 1) {
        matchedElement = elements[0];
        totalCount = 1;
        break;
      }
    }

    if (foundMultiple) {
      return { status: 'ambiguous', targetId, count: totalCount };
    }

    if (!matchedElement) {
      return { status: 'missing', targetId };
    }

    // Safety and usability validations
    if (!matchedElement.isConnected) {
      return { status: 'missing', targetId };
    }

    if (!isElementVisible(matchedElement)) {
      return { status: 'hidden', targetId };
    }

    if (
      !isElementEnabled(matchedElement) ||
      matchedElement.hasAttribute('disabled') ||
      matchedElement.getAttribute('aria-disabled') === 'true' ||
      matchedElement.hasAttribute('inert')
    ) {
      return { status: 'disabled', targetId };
    }

    if (isSensitiveElement(matchedElement)) {
      return { status: 'unsupported_page', targetId };
    }

    return {
      status: 'verified',
      element: matchedElement,
      targetId,
    };
  }

  /**
   * Idempotent disposal of adapter resources.
   */
  public dispose(): void {
    // Milestone 3 maintains no persistent observers or listeners
  }
}

export const amazonCheckoutAdapter = new AmazonCheckoutAdapter();
