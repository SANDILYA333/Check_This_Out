import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import { resolveAdapter, registerAdapter, unregisterAdapter, resetAdapterRegistry } from '../../src/content/adapters/pageAdapterRegistry.ts';
import { demoCheckoutAdapter } from '../../src/content/adapters/demoCheckoutAdapter.ts';
import { amazonCheckoutAdapter } from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import { evaluateAmazonOrderOutcome } from '../../src/content/adapters/amazonConfirmationEvaluator.ts';
import {
  mountAssistant,
  unmountAssistant,
  isAssistantMounted,
  getActiveController,
  getActiveAmazonController,
  getActiveCoordinator,
  getActiveHighlighter,
  getActiveAdapter,
} from '../../src/content/assistant/lifecycle.ts';
import { mockPaymentService } from '../../src/payments/mockPaymentService.ts';
import { getMessage } from '../../src/localization/index.ts';
import { audioService } from '../../src/audio/audioService.ts';
import type { Language } from '../../src/guidance/types.ts';

function createSyntheticDoc(
  url: string,
  elementInits: Array<{
    tagName?: string;
    id?: string;
    attributes?: Record<string, string>;
    style?: { display?: string; visibility?: string; opacity?: string };
    disabled?: boolean;
    isConnected?: boolean;
    textContent?: string;
  }> = []
): MockDocument {
  const doc = new MockDocument();
  (doc as unknown as { URL: string }).URL = url;
  const parsedUrl = new URL(url);
  (doc as unknown as { location: { href: string; hostname: string; pathname: string } }).location = {
    href: url,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
  };

  for (const init of elementInits) {
    const el = new MockHTMLElement(init);
    doc.body.appendChild(el);
  }

  return doc;
}

test('End-to-End Integration — Scenario A: Controlled Demo Lifecycle and Simulated Payments', async (t) => {
  await t.test('Demo initialization mounts Shadow DOM assistant with isolated PaymentCoordinator', () => {
    const demoDoc = createSyntheticDoc('http://localhost:5173/demo/index.html', [
      {
        tagName: 'DIV',
        id: 'voicecheckout-demo-root',
        attributes: { 'data-voicecheckout-demo': 'true' },
      },
      {
        tagName: 'DIV',
        attributes: { 'data-testid': 'checkout-total' },
      },
      { id: 'start-btn' },
    ]);

    const adapter = resolveAdapter(demoDoc as unknown as Document);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.siteId, 'demo');

    const mounted = mountAssistant(demoDoc as unknown as Document, { adapter });
    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);

    const controller = getActiveController();
    assert.ok(controller !== null);
    assert.strictEqual(controller.getState().stage, 'WELCOME');

    const coordinator = getActiveCoordinator();
    assert.ok(coordinator !== null, 'Demo adapter must instantiate PaymentCoordinator');

    unmountAssistant(demoDoc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(getActiveCoordinator(), null);
  });
});

test('End-to-End Integration — Scenario B: Amazon Cart Detection and Target Resolution', async (t) => {
  await t.test('Cart page detected, Amazon adapter resolved, single proceed button verified and highlighted', () => {
    const cartDoc = createSyntheticDoc('https://www.amazon.in/gp/cart/view.html', [
      {
        tagName: 'INPUT',
        attributes: { name: 'proceedToRetailCheckout', type: 'submit', value: 'Proceed to Buy' },
      },
    ]);

    const adapter = resolveAdapter(cartDoc as unknown as Document);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.siteId, 'amazon_in');

    const mounted = mountAssistant(cartDoc as unknown as Document, { adapter });
    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);

    const amazonController = getActiveAmazonController();
    assert.ok(amazonController !== null);
    assert.strictEqual(amazonController.getState().intent, 'GUIDE_CART');
    assert.strictEqual(amazonController.getState().targetId, 'amazon-proceed-to-buy');

    const highlighter = getActiveHighlighter();
    assert.ok(highlighter !== null);
    highlighter.update(amazonController.getState().targetId, cartDoc as unknown as Document);
    assert.ok(highlighter.getHighlightedElement() !== null);

    // CRITICAL: Must not instantiate demo payment coordinator
    assert.strictEqual(getActiveCoordinator(), null);

    unmountAssistant(cartDoc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
  });

  await t.test('Ambiguous multiple proceed buttons result in safe unhighlight without guessing', () => {
    const ambiguousCartDoc = createSyntheticDoc('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'INPUT', attributes: { name: 'proceedToRetailCheckout', type: 'submit' } },
      { tagName: 'INPUT', attributes: { name: 'proceedToRetailCheckout', type: 'submit' } },
    ]);

    const adapter = resolveAdapter(ambiguousCartDoc as unknown as Document);
    assert.ok(adapter !== null);

    const lookup = adapter.lookupTarget('amazon-proceed-to-buy', ambiguousCartDoc as unknown as Document);
    assert.strictEqual(lookup.status, 'ambiguous');

    mountAssistant(ambiguousCartDoc as unknown as Document, { adapter });
    const highlighter = getActiveHighlighter();
    assert.strictEqual(highlighter?.getHighlightedElement(), null);

    unmountAssistant(ambiguousCartDoc as unknown as Document);
  });
});

test('End-to-End Integration — Scenario C: Amazon Address, Payment, and Review Progression', async (t) => {
  await t.test('Address selection screen maps to GUIDE_ADDRESS_SELECTION with verified continue control', () => {
    const addressDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/addressselect/handlers/display.html', [
      { id: 'shipToThisAddressButton' },
    ]);

    const adapter = resolveAdapter(addressDoc as unknown as Document);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.siteId, 'amazon_in');

    const observation = adapter.observePageState(addressDoc as unknown as Document);
    assert.strictEqual(observation.pageState, 'ADDRESS_SELECTION');

    mountAssistant(addressDoc as unknown as Document, { adapter });
    const controller = getActiveAmazonController();
    assert.strictEqual(controller?.getState().intent, 'GUIDE_ADDRESS_SELECTION');
    assert.strictEqual(controller?.getState().targetId, 'amazon-select-address');

    unmountAssistant(addressDoc as unknown as Document);
  });

  await t.test('Payment selection screen maps to GUIDE_PAYMENT_SELECTION with verified continue control', () => {
    const paymentDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/payselect/handlers/display.html', [
      { tagName: 'INPUT', attributes: { name: 'ppw-widgetEvent:SetPaymentPlanSelectContinueEvent', type: 'submit' } },
    ]);

    const adapter = resolveAdapter(paymentDoc as unknown as Document);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.siteId, 'amazon_in');

    const observation = adapter.observePageState(paymentDoc as unknown as Document);
    assert.strictEqual(observation.pageState, 'PAYMENT_SELECTION');

    mountAssistant(paymentDoc as unknown as Document, { adapter });
    const controller = getActiveAmazonController();
    assert.strictEqual(controller?.getState().intent, 'GUIDE_PAYMENT_SELECTION');
    assert.strictEqual(controller?.getState().targetId, 'amazon-select-payment');

    unmountAssistant(paymentDoc as unknown as Document);
  });

  await t.test('Order review screen maps to GUIDE_ORDER_REVIEW and remains NOT_SUBMITTED without auto-click', () => {
    const reviewDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/spc/handlers/display.html', [
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const adapter = resolveAdapter(reviewDoc as unknown as Document);
    assert.ok(adapter !== null);
    assert.strictEqual(adapter.siteId, 'amazon_in');

    const observation = adapter.observePageState(reviewDoc as unknown as Document);
    assert.strictEqual(observation.pageState, 'ORDER_REVIEW');

    const outcome = evaluateAmazonOrderOutcome(reviewDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'NOT_SUBMITTED');

    mountAssistant(reviewDoc as unknown as Document, { adapter });
    const controller = getActiveAmazonController();
    assert.strictEqual(controller?.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller?.getState().targetId, 'amazon-place-order');

    unmountAssistant(reviewDoc as unknown as Document);
  });
});

test('End-to-End Integration — Scenario D: Conservative Order-Outcome Evaluation', async (t) => {
  await t.test('Confirmed outcome strictly requires confirmation route and verified container', () => {
    const confirmedDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/thankyou', [
      { id: 'header-order-placed', textContent: 'Thank you, your order has been placed' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(confirmedDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    if (outcome.status === 'CONFIRMED') {
      assert.strictEqual(outcome.evidence.matchedMarker, 'header-order-placed');
      assert.strictEqual(outcome.evidence.confirmedUrl, 'https://www.amazon.in/gp/buy/thankyou');
    }
  });

  await t.test('Generic thank you text on confirmation URL without container returns UNCONFIRMED', () => {
    const unconfirmedDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/thankyou', [
      { tagName: 'P', textContent: 'Thank you for shopping with Amazon' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(unconfirmedDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'missing_confirmation_marker');
    }
  });

  await t.test('Empty cart after submit is UNCONFIRMED (empty cart != success)', () => {
    const emptyCartDoc = createSyntheticDoc('https://www.amazon.in/cart', [
      { id: 'sc-empty-cart' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(emptyCartDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'empty_cart_unconfirmed');
    }
  });

  await t.test('Intermediate pending payment screen evaluates to PENDING, never CONFIRMED', () => {
    const pendingDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/pay/processing', [
      { id: 'upi-pending-view' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(pendingDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'PENDING');
  });

  await t.test('Conflicting signals: confirmation marker and payment failed banner evaluates to UNCONFIRMED', () => {
    const conflictDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/thankyou', [
      { id: 'header-order-placed' },
      { id: 'payment-failed-alert' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(conflictDoc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'conflicting_evidence');
    }
  });
});

test('End-to-End Integration — Scenario E: Amazon and Demo Mock Payment Complete Isolation', async (t) => {
  await t.test('Automated runtime spies confirm zero calls to mockPaymentService on Amazon path', () => {
    let createOrderCalls = 0;
    let getStatusCalls = 0;
    let executeScenarioCalls = 0;

    const originalCreate = mockPaymentService.createOrder;
    const originalGetStatus = mockPaymentService.getStatus;
    const originalExecute = mockPaymentService.executeScenario;

    mockPaymentService.createOrder = async () => {
      createOrderCalls++;
      return originalCreate.call(mockPaymentService);
    };
    mockPaymentService.getStatus = async (id: string) => {
      getStatusCalls++;
      return originalGetStatus.call(mockPaymentService, id);
    };
    mockPaymentService.executeScenario = () => {
      executeScenarioCalls++;
      return originalExecute.call(mockPaymentService, 'immediate_success');
    };

    try {
      const amazonDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/spc/handlers/display.html', [
        { id: 'bottomSubmitOrderButtonId' },
        { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
      ]);

      const adapter = resolveAdapter(amazonDoc as unknown as Document);
      mountAssistant(amazonDoc as unknown as Document, { adapter: adapter! });

      const controller = getActiveAmazonController();
      controller?.notifyUserAction();
      controller?.handlePageUpdate(amazonDoc as unknown as Document);

      assert.strictEqual(createOrderCalls, 0, 'Amazon path must NEVER call mockPaymentService.createOrder');
      assert.strictEqual(getStatusCalls, 0, 'Amazon path must NEVER call mockPaymentService.getStatus');
      assert.strictEqual(executeScenarioCalls, 0, 'Amazon path must NEVER call mockPaymentService.executeScenario');
      assert.strictEqual(getActiveCoordinator(), null, 'activeCoordinator must remain null on Amazon');

      unmountAssistant(amazonDoc as unknown as Document);
    } finally {
      mockPaymentService.createOrder = originalCreate;
      mockPaymentService.getStatus = originalGetStatus;
      mockPaymentService.executeScenario = originalExecute;
    }
  });
});

test('End-to-End Integration — Scenario F: Voice and Localization Coverage and Fallback', async (t) => {
  await t.test('All guidance and outcome keys provide non-empty text in English, Hindi, and Telugu', () => {
    const languages: Language[] = ['en', 'hi', 'te'];
    const amazonKeys = [
      'amazon_cart_instruction',
      'amazon_address_instruction',
      'amazon_payment_instruction',
      'amazon_review_instruction',
      'amazon_outcome_confirmed',
      'amazon_outcome_unconfirmed',
      'amazon_outcome_pending',
      'amazon_outcome_failed',
    ] as const;

    for (const lang of languages) {
      for (const key of amazonKeys) {
        const text = getMessage(lang, key);
        assert.ok(typeof text === 'string' && text.length > 5, `Expected non-empty text for ${lang}.${key}`);
      }
    }
  });

  await t.test('Audio service gracefully reports unavailable status without crashing on Amazon prompts', async () => {
    let lastStatus = '';
    const unsubscribe = audioService.subscribe((status) => {
      lastStatus = status;
    });

    try {
      await audioService.play('en', 'amazon_review_instruction' as any);
      assert.strictEqual(lastStatus, 'unavailable', 'Audio service must emit unavailable for non-bundled audio');
    } finally {
      unsubscribe();
    }
  });
});

test('End-to-End Integration — Scenario G: Lifecycle, Duplicate Prevention, and Clean Recovery', async (t) => {
  await t.test('Repeated mount calls do not create duplicate Shadow DOM hosts or multiple controllers', () => {
    const doc = createSyntheticDoc('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'INPUT', attributes: { name: 'proceedToRetailCheckout', type: 'submit' } },
    ]);
    const adapter = resolveAdapter(doc as unknown as Document);

    const firstMount = mountAssistant(doc as unknown as Document, { adapter: adapter! });
    assert.strictEqual(firstMount, true);
    const firstController = getActiveAmazonController();

    const secondMount = mountAssistant(doc as unknown as Document, { adapter: adapter! });
    assert.strictEqual(secondMount, true);
    const secondController = getActiveAmazonController();

    assert.strictEqual(firstController, secondController, 'Repeated mount must reuse active controller');

    const hosts = doc.body.querySelectorAll('#voicecheckout-assistant-root');
    assert.strictEqual(hosts.length, 1, 'Only one assistant host element must exist');

    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
  });
});

test('End-to-End Integration — Scenario H: Privacy Invariant — Sensitive Field Exclusion', async (t) => {
  await t.test('Target lookup rejects inputs bearing sensitive tokens (password, cvv, otp, pin, secret)', () => {
    const sensitiveDoc = createSyntheticDoc('https://www.amazon.in/gp/buy/spc/handlers/display.html', [
      { tagName: 'INPUT', attributes: { name: 'password', type: 'password', value: 'secret123' } },
      { tagName: 'INPUT', attributes: { name: 'cvv', type: 'text', value: '999' } },
      { tagName: 'INPUT', attributes: { id: 'auth-mfa-otpcode', type: 'text', value: '123456' } },
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const adapter = resolveAdapter(sensitiveDoc as unknown as Document);
    assert.ok(adapter !== null);

    const lookup = adapter.lookupTarget('amazon-place-order', sensitiveDoc as unknown as Document);
    assert.strictEqual(lookup.status, 'verified');
    if (lookup.status === 'verified') {
      const name = lookup.element.getAttribute('name');
      assert.strictEqual(name, 'placeYourOrder1');
      assert.strictEqual(name?.includes('password'), false);
      assert.strictEqual(name?.includes('cvv'), false);
    }
  });
});
