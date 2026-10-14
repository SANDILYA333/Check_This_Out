import type {
  AmazonOrderOutcome,
  ConfirmationMarker,
  FailureReason,
  PendingReason,
} from './types.ts';
import { extractDocumentUrl } from './amazonCheckoutAdapter.ts';
import { isElementVisible } from '../targets/targetRegistry.ts';

/**
 * Candidate DOM selectors for verified Amazon order confirmation containers.
 * Note: These are candidate markers derived from technical audit.
 * Live production markup may vary across Amazon experiment flights.
 */
export const CONFIRMATION_SELECTORS: readonly {
  marker: ConfirmationMarker;
  selector: string;
}[] = [
  { marker: 'header-order-placed', selector: '#header-order-placed' },
  { marker: 'order-placed-confirmation', selector: '[data-testid="order-placed-confirmation"]' },
  { marker: 'thank-you-page', selector: '#thankYouPage' },
  { marker: 'thank-you-page', selector: '.thank-you-page' },
  { marker: 'thank-you-message', selector: '#thank-you-message' },
] as const;

/**
 * Explicit payment/order pending indicators (e.g. intermediate UPI processing).
 */
export const PENDING_SELECTORS: readonly {
  reason: PendingReason;
  selector: string;
}[] = [
  { reason: 'upi_pending_indicator', selector: '#upi-pending-view' },
  { reason: 'payment_processing_indicator', selector: '#payment-processing-status' },
  { reason: 'payment_processing_indicator', selector: '[data-testid="payment-pending"]' },
  { reason: 'payment_processing_indicator', selector: '#processingPayment' },
  { reason: 'order_processing_indicator', selector: '[data-testid="processing-order-status"]' },
] as const;

/**
 * Explicit failure indicators (e.g. payment declined banner, order failed alert).
 */
export const FAILURE_SELECTORS: readonly {
  reason: FailureReason;
  selector: string;
}[] = [
  { reason: 'payment_declined_indicator', selector: '#payment-failed-alert' },
  { reason: 'payment_declined_indicator', selector: '[data-testid="payment-failed"]' },
  { reason: 'payment_declined_indicator', selector: '#payment-declined-alert' },
  { reason: 'payment_declined_indicator', selector: '.payment-failed-banner' },
  { reason: 'order_failed_indicator', selector: '#order-failed-message' },
] as const;

/**
 * Active checkout controls that indicate the checkout process has not yet completed.
 */
const ACTIVE_CHECKOUT_SELECTORS = [
  'input[name="placeYourOrder1"]',
  '#bottomSubmitOrderButtonId',
  '[data-testid="spc-place-order"]',
  '#placeYourOrder',
  '#activeCartViewForm',
  'input[name="proceedToRetailCheckout"]',
  '#shipToThisAddressButton',
  'input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]',
] as const;

/**
 * Security challenge and authentication gate selectors.
 */
const SECURITY_CHALLENGE_SELECTORS = [
  'form[action*="validateCaptcha"]',
  '#captchacharacters',
  '#auth-mfa-form',
  'input#auth-mfa-otpcode',
  '[data-testid="security-challenge-container"]',
] as const;

const AUTH_SELECTORS = [
  '#ap_signin_form',
  'form[name="signIn"]',
  '#signInSubmit',
  'input#ap_email',
  '[data-testid="auth-signin-form"]',
] as const;

function hasElement(doc: Document, selector: string): boolean {
  try {
    return doc.querySelector(selector) !== null;
  } catch {
    return false;
  }
}

function findElement(doc: Document, selector: string): HTMLElement | null {
  try {
    return doc.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

/**
 * Evaluates the outcome of an Amazon India checkout session.
 *
 * Safety Invariants:
 * 1. Strictly read-only: never calls .click(), .submit(), or triggers mutations.
 * 2. Zero credential or PII handling: never reads or records order IDs, account names,
 *    payment tokens, PINs, OTPs, or addresses.
 * 3. Absence of error is NOT proof of success.
 * 4. A click, redirect, loading state, or pending payment is NOT proof of success.
 * 5. Requires verified confirmation container matching on a confirmed route with
 *    corroborating visibility and zero conflicting signals.
 */
export function evaluateAmazonOrderOutcome(doc?: Document | null): AmazonOrderOutcome {
  if (!doc) {
    return { status: 'UNCONFIRMED', reason: 'missing_document' };
  }

  const url = extractDocumentUrl(doc);
  if (!url) {
    return { status: 'UNCONFIRMED', reason: 'missing_url' };
  }

  if (url.hostname !== 'www.amazon.in') {
    return { status: 'UNCONFIRMED', reason: 'unsupported_hostname' };
  }

  const pathname = url.pathname.toLowerCase();

  // 1. Security Challenge interruption (CAPTCHA / OTP MFA)
  const isCaptchaUrl =
    pathname.includes('/errors/validatecaptcha') || pathname.includes('/captcha');
  const hasCaptchaDom = SECURITY_CHALLENGE_SELECTORS.some((sel) => hasElement(doc, sel));
  if (isCaptchaUrl || hasCaptchaDom) {
    return { status: 'UNCONFIRMED', reason: 'security_challenge_interruption' };
  }

  // 2. Authentication Gate interruption
  const isAuthUrl =
    pathname.startsWith('/ap/signin') ||
    pathname.startsWith('/ap/register') ||
    pathname.includes('/signin');
  const hasAuthDom = AUTH_SELECTORS.some((sel) => hasElement(doc, sel));
  if (isAuthUrl || hasAuthDom) {
    return { status: 'UNCONFIRMED', reason: 'auth_interruption' };
  }

  // 3. Explicit Payment/Order Failure signals
  let detectedFailureReason: FailureReason | null = null;
  for (const { reason, selector } of FAILURE_SELECTORS) {
    if (hasElement(doc, selector)) {
      detectedFailureReason = reason;
      break;
    }
  }

  // 4. Explicit Pending / Processing state signals
  let detectedPendingReason: PendingReason | null = null;
  for (const { reason, selector } of PENDING_SELECTORS) {
    if (hasElement(doc, selector)) {
      detectedPendingReason = reason;
      break;
    }
  }

  // 5. Active checkout controls (review submit button, address button, etc.)
  const hasActiveCheckoutControls = ACTIVE_CHECKOUT_SELECTORS.some((sel) => hasElement(doc, sel));

  // 6. Check for verified confirmation markers
  let matchedMarker: ConfirmationMarker | null = null;
  let matchedMarkerElement: HTMLElement | null = null;

  for (const { marker, selector } of CONFIRMATION_SELECTORS) {
    const el = findElement(doc, selector);
    if (el) {
      matchedMarker = marker;
      matchedMarkerElement = el;
      break;
    }
  }

  // 7. Conflicting signals: both confirmation marker and failure or active checkout controls
  if (matchedMarker && (detectedFailureReason || hasActiveCheckoutControls)) {
    return { status: 'UNCONFIRMED', reason: 'conflicting_evidence' };
  }

  // 8. If explicit failure is present without conflicting confirmation, return FAILED
  if (detectedFailureReason) {
    return { status: 'FAILED', reason: detectedFailureReason };
  }

  // 9. If explicit pending/processing is present, return PENDING (never success)
  if (detectedPendingReason) {
    return { status: 'PENDING', reason: detectedPendingReason };
  }

  // 10. Check if user is still on review or earlier active checkout stage
  const isReviewUrl = pathname.startsWith('/gp/buy/spc') || pathname.includes('/spc');
  const isCartUrl =
    pathname === '/cart' || pathname.startsWith('/cart/') || pathname.startsWith('/gp/cart');
  const isAddressUrl =
    pathname.startsWith('/gp/buy/addressselect') || pathname.includes('/addressselect');
  const isPaymentUrl =
    pathname.startsWith('/gp/buy/payselect') || pathname.includes('/payselect');

  if (hasActiveCheckoutControls || isReviewUrl || isAddressUrl || isPaymentUrl) {
    return { status: 'NOT_SUBMITTED' };
  }

  // 11. Empty cart after submission check: empty cart is NOT confirmation of placed order
  const hasEmptyCart =
    hasElement(doc, '#sc-empty-cart') ||
    hasElement(doc, '[data-name="sc-empty-cart"]') ||
    hasElement(doc, '[data-testid="sc-empty-cart"]');
  if (isCartUrl && hasEmptyCart) {
    return { status: 'UNCONFIRMED', reason: 'empty_cart_unconfirmed' };
  }

  // 12. Evaluate Confirmation URL and Marker Corroboration
  const isConfirmationUrl =
    pathname.startsWith('/gp/buy/thankyou') ||
    pathname.includes('/thankyou') ||
    pathname.startsWith('/checkout/thankyou');

  if (isConfirmationUrl) {
    if (matchedMarker && matchedMarkerElement) {
      // Corroboration: element must be connected and visible
      const isConnected = matchedMarkerElement.isConnected;
      const isVisible = isElementVisible(matchedMarkerElement);

      if (isConnected && isVisible) {
        // Sanitize URL: only origin + pathname; strip all query strings and hashes
        const sanitizedUrl = `${url.origin}${url.pathname}`;
        return {
          status: 'CONFIRMED',
          evidence: {
            confirmedUrl: sanitizedUrl,
            matchedMarker,
            corroborated: true,
            checkedTimestamp: Date.now(),
          },
        };
      }

      // Marker element is hidden or detached
      return { status: 'UNCONFIRMED', reason: 'missing_confirmation_marker' };
    }

    // On confirmation URL but missing verified container marker
    return { status: 'UNCONFIRMED', reason: 'missing_confirmation_marker' };
  }

  // 13. If on non-confirmation URL but has a confirmation marker (unexpected/conflicted route)
  if (matchedMarker) {
    return { status: 'UNCONFIRMED', reason: 'non_confirmation_url' };
  }

  // 14. Unknown redirect or non-checkout Amazon page
  return { status: 'UNCONFIRMED', reason: 'unknown_redirect' };
}
