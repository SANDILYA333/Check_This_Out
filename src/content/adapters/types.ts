import type { TargetId } from '../../guidance/types.ts';
import type { TargetLookupResult } from '../targets/targetRegistry.ts';
import type { GuidanceController } from '../assistant/guidanceController.ts';
import type { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';

export type SiteId = 'demo' | 'amazon_in' | 'shopsphere-demo' | 'unsupported';

export type SupportFailureReason =
  | 'missing_document'
  | 'missing_marker'
  | 'malformed_root'
  | 'unsupported_page'
  | 'missing_url'
  | 'unsupported_hostname'
  | 'unsupported_amazon_page'
  | 'unverified_page_state'
  | string;

export interface PageSupportResult {
  readonly supported: boolean;
  readonly siteId?: SiteId;
  readonly reason?: SupportFailureReason;
}

export type AmazonPageState =
  | 'CART'
  | 'ADDRESS_SELECTION'
  | 'PAYMENT_SELECTION'
  | 'ORDER_REVIEW'
  | 'ORDER_CONFIRMATION'
  | 'EMPTY_CART'
  | 'AUTH_REQUIRED'
  | 'SECURITY_CHALLENGE'
  | 'UNSUPPORTED'
  | 'UNVERIFIED';

export type ShopSpherePageState =
  | 'LANDING'
  | 'PRODUCT_DETAILS'
  | 'CART'
  | 'ADDRESS_SELECTION'
  | 'DELIVERY_SELECTION'
  | 'PAYMENT_SELECTION'
  | 'ORDER_REVIEW'
  | 'DEMO_PAYMENT'
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_PENDING'
  | 'RESULT_UNCONFIRMED'
  | 'EMPTY_CART'
  | 'UNSUPPORTED'
  | 'UNVERIFIED';

export interface PageObservation {
  readonly supported: boolean;
  readonly siteId: SiteId;
  readonly pageState?: AmazonPageState | ShopSpherePageState | string;
  readonly unverifiedReason?: string;
}

export type ConfirmationMarker =
  | 'header-order-placed'
  | 'order-placed-confirmation'
  | 'thank-you-page'
  | 'thank-you-message';

export interface ConfirmationEvidence {
  readonly confirmedUrl: string;
  readonly matchedMarker: ConfirmationMarker;
  readonly corroborated: boolean;
  readonly checkedTimestamp: number;
}

export type UnconfirmedReason =
  | 'missing_document'
  | 'missing_url'
  | 'unsupported_hostname'
  | 'non_confirmation_url'
  | 'missing_confirmation_marker'
  | 'conflicting_evidence'
  | 'empty_cart_unconfirmed'
  | 'unknown_redirect'
  | 'generic_thank_you_unverified'
  | 'security_challenge_interruption'
  | 'auth_interruption'
  | 'intermediate_review_state'
  | 'unverified_page_state';

export type PendingReason =
  | 'payment_processing_indicator'
  | 'order_processing_indicator'
  | 'upi_pending_indicator';

export type FailureReason =
  | 'payment_declined_indicator'
  | 'order_failed_indicator';

export type AmazonOrderOutcome =
  | {
      readonly status: 'CONFIRMED';
      readonly evidence: ConfirmationEvidence;
    }
  | {
      readonly status: 'UNCONFIRMED';
      readonly reason: UnconfirmedReason;
    }
  | {
      readonly status: 'PENDING';
      readonly reason: PendingReason;
    }
  | {
      readonly status: 'FAILED';
      readonly reason: FailureReason;
    }
  | {
      readonly status: 'NOT_SUBMITTED';
    };


/**
 * SiteAdapter contract representing a supported shopping or checkout site.
 *
 * Invariants:
 * 1. Strictly read-only: never programmatically clicks, submits, or navigates.
 * 2. Does not collect, read, or log sensitive credentials (PINs, passwords, OTPs, CVVs).
 * 3. Idempotent cleanup via dispose().
 * 4. Preserves target verification states (verified, missing, ambiguous, hidden, disabled, unsupported_page).
 */
export interface SiteAdapter {
  readonly siteId: SiteId;
  readonly name: string;

  /**
   * Evaluates whether this adapter recognizes and supports the provided document.
   * Pure inspection: does not mutate or trigger controls.
   */
  detectPage(doc?: Document | null): PageSupportResult;

  /**
   * Observes the current page state and characteristics without collecting sensitive data.
   */
  observePageState(doc?: Document | null): PageObservation;

  /**
   * Resolves and verifies a target control within the document.
   * Returns 'ambiguous' if multiple matching controls exist; never guesses.
   */
  lookupTarget(targetId: TargetId, doc?: Document | null): TargetLookupResult;

  /**
   * Cleans up any resources, cached DOM references, or temporary state held by the adapter.
   * Must be idempotent and safe to call repeatedly.
   */
  dispose(): void;

  /**
   * Optional payment coordinator factory for simulated checkout environments (demo only).
   * Real-store adapters must NOT implement this method.
   */
  createPaymentCoordinator?(controller: GuidanceController): PaymentCoordinator | undefined;
}
