import type {
  PageObservation,
  PageSupportResult,
  SiteAdapter,
  SiteId,
  SupportFailureReason,
} from './types.ts';
import type { TargetId } from '../../guidance/types.ts';
import { lookupTarget, type TargetLookupResult } from '../targets/targetRegistry.ts';
import type { GuidanceController } from '../assistant/guidanceController.ts';
import { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';
import { mockPaymentService } from '../../payments/mockPaymentService.ts';

export type { SupportFailureReason, PageSupportResult };

export const DEMO_PAGE_MARKER_ATTR = 'data-voicecheckout-demo';

/**
 * Deterministically checks whether the provided Document is the team's
 * controlled demo checkout page.
 *
 * Requirements:
 * - Read-only: never modifies page content or attributes.
 * - Never triggers any control or synthetic event.
 * - Checks for the stable project-owned marker and verifies minimal root structure.
 */
export function isControlledCheckoutPage(doc?: Document | null): PageSupportResult {
  if (!doc || !doc.body) {
    return { supported: false, reason: 'missing_document' };
  }

  // Check for the project-owned marker attribute on body or a root container
  const hasMarkerOnBody = doc.body.hasAttribute(DEMO_PAGE_MARKER_ATTR);
  const markerElement = doc.querySelector(`[${DEMO_PAGE_MARKER_ATTR}]`);

  if (!hasMarkerOnBody && !markerElement) {
    return { supported: false, reason: 'missing_marker' };
  }

  // Verify minimal demo checkout root integrity (total or product card must be present)
  const hasTotal = doc.querySelector('[data-testid="checkout-total"]') !== null;
  const hasProduct = doc.querySelector('[data-testid="product-card"]') !== null;

  if (!hasTotal && !hasProduct) {
    return { supported: false, reason: 'malformed_root' };
  }

  return { supported: true, siteId: 'demo' };
}

/**
 * DemoCheckoutAdapter: Conforming implementation of SiteAdapter for the team-owned
 * controlled demo store (public/demo/index.html).
 *
 * Safety Invariants:
 * 1. Strictly read-only: never triggers clicks or submits forms.
 * 2. Provides simulated payment coordinator ONLY for the controlled demo.
 * 3. Does not read or collect sensitive payment credentials.
 * 4. Idempotent cleanup via dispose().
 */
export class DemoCheckoutAdapter implements SiteAdapter {
  readonly siteId: SiteId = 'demo';
  readonly name: string = 'Controlled Demo Store';

  public detectPage(doc?: Document | null): PageSupportResult {
    const res = isControlledCheckoutPage(doc);
    return {
      supported: res.supported,
      siteId: res.supported ? 'demo' : undefined,
      reason: res.reason,
    };
  }

  public observePageState(doc?: Document | null): PageObservation {
    const detection = this.detectPage(doc);
    if (!detection.supported) {
      return {
        supported: false,
        siteId: 'unsupported',
        unverifiedReason: detection.reason,
      };
    }

    return {
      supported: true,
      siteId: 'demo',
      pageState: 'CONTROLLED_DEMO',
    };
  }

  public lookupTarget(targetId: TargetId, doc?: Document | null): TargetLookupResult {
    return lookupTarget(targetId, doc);
  }

  public createPaymentCoordinator(controller: GuidanceController): PaymentCoordinator {
    return new PaymentCoordinator({
      controller,
      service: mockPaymentService,
    });
  }

  public dispose(): void {
    // The demo adapter maintains no long-lived global subscriptions
  }
}

export const demoCheckoutAdapter = new DemoCheckoutAdapter();
