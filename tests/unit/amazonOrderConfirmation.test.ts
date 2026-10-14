import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  evaluateAmazonOrderOutcome,
} from '../../src/content/adapters/amazonConfirmationEvaluator.ts';
import {
  amazonCheckoutAdapter,
} from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import {
  AmazonGuidanceController,
} from '../../src/content/assistant/amazonGuidanceController.ts';
import {
  mountAssistant,
  unmountAssistant,
  getActiveCoordinator,
  getActiveAmazonController,
  isAssistantMounted,
} from '../../src/content/assistant/lifecycle.ts';
import { mockPaymentService } from '../../src/payments/mockPaymentService.ts';
import { getMessage } from '../../src/localization/index.ts';
import type { AmazonOrderOutcome } from '../../src/content/adapters/types.ts';

function createSyntheticAmazonDoc(
  pathname: string,
  elementInits: Array<{
    tagName?: string;
    id?: string;
    attributes?: Record<string, string>;
    style?: { display?: string; visibility?: string };
    disabled?: boolean;
    isConnected?: boolean;
    textContent?: string;
  }> = []
): MockDocument {
  const url = `https://www.amazon.in${pathname}`;
  const doc = new MockDocument();
  (doc as unknown as { URL: string }).URL = url;
  (doc as unknown as { location: { href: string; hostname: string; pathname: string } }).location = {
    href: url,
    hostname: 'www.amazon.in',
    pathname,
  };

  for (const init of elementInits) {
    const el = new MockHTMLElement(init);
    doc.body.appendChild(el);
  }

  return doc;
}

test('Amazon Order Outcome — Confirmation Evidence Evaluator', async (t) => {
  await t.test('Confirms order with verified #header-order-placed on /gp/buy/thankyou', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed', textContent: 'Order placed, thank you' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    if (outcome.status === 'CONFIRMED') {
      assert.strictEqual(outcome.evidence.matchedMarker, 'header-order-placed');
      assert.strictEqual(outcome.evidence.corroborated, true);
      assert.strictEqual(outcome.evidence.confirmedUrl, 'https://www.amazon.in/gp/buy/thankyou');
      assert.ok(outcome.evidence.checkedTimestamp > 0);
    }
  });

  await t.test('Confirms order with [data-testid="order-placed-confirmation"]', () => {
    const doc = createSyntheticAmazonDoc('/checkout/thankyou', [
      { attributes: { 'data-testid': 'order-placed-confirmation' } },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    if (outcome.status === 'CONFIRMED') {
      assert.strictEqual(outcome.evidence.matchedMarker, 'order-placed-confirmation');
    }
  });

  await t.test('Confirms order with #thankYouPage on /thankyou route', () => {
    const doc = createSyntheticAmazonDoc('/thankyou', [
      { id: 'thankYouPage' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    if (outcome.status === 'CONFIRMED') {
      assert.strictEqual(outcome.evidence.matchedMarker, 'thank-you-page');
    }
  });

  await t.test('Confirmation URL without verified DOM container remains UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { tagName: 'DIV', id: 'unrelated-banner', textContent: 'Some other banner' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'missing_confirmation_marker');
    }
  });

  await t.test('Generic thank you text without verified container remains UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { tagName: 'P', id: 'random-text', textContent: 'Thank you for shopping with us' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'missing_confirmation_marker');
    }
  });

  await t.test('Confirmation marker on non-confirmation route (e.g. /cart) remains UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/cart', [
      { id: 'thankYouPage' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'non_confirmation_url');
    }
  });

  await t.test('Conflicting signals: confirmation marker AND payment-failed alert returns UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed' },
      { id: 'payment-failed-alert' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'conflicting_evidence');
    }
  });

  await t.test('Conflicting signals: confirmation marker AND active place-order button returns UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed' },
      { id: 'bottomSubmitOrderButtonId' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'conflicting_evidence');
    }
  });

  await t.test('Active review page is NOT_SUBMITTED', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
      { id: 'bottomSubmitOrderButtonId' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'NOT_SUBMITTED');
  });

  await t.test('Disabled submit button on review page remains NOT_SUBMITTED (no success inference)', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' }, disabled: true },
      { id: 'bottomSubmitOrderButtonId', disabled: true },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'NOT_SUBMITTED');
  });

  await t.test('Empty cart after submission returns UNCONFIRMED (empty cart != success)', () => {
    const doc = createSyntheticAmazonDoc('/cart', [
      { id: 'sc-empty-cart' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'empty_cart_unconfirmed');
    }
  });

  await t.test('Intermediate pending state returns PENDING (never success)', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/payment/processing', [
      { id: 'upi-pending-view' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'PENDING');
    if (outcome.status === 'PENDING') {
      assert.strictEqual(outcome.reason, 'upi_pending_indicator');
    }
  });

  await t.test('Explicit failure banner returns FAILED with payment_declined_indicator', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/payment/error', [
      { id: 'payment-failed-alert' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'FAILED');
    if (outcome.status === 'FAILED') {
      assert.strictEqual(outcome.reason, 'payment_declined_indicator');
    }
  });

  await t.test('Security challenge / CAPTCHA pauses and returns UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/errors/validatecaptcha', [
      { id: 'captchacharacters' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'security_challenge_interruption');
    }
  });

  await t.test('Authentication gate pauses and returns UNCONFIRMED', () => {
    const doc = createSyntheticAmazonDoc('/ap/signin', [
      { id: 'ap_signin_form' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'auth_interruption');
    }
  });

  await t.test('Unknown redirect returns UNCONFIRMED (unknown_redirect)', () => {
    const doc = createSyntheticAmazonDoc('/gp/yourstore/home', []);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'unknown_redirect');
    }
  });

  await t.test('Hidden confirmation container returns UNCONFIRMED (corroboration check)', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed', style: { display: 'none' } },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'UNCONFIRMED');
    if (outcome.status === 'UNCONFIRMED') {
      assert.strictEqual(outcome.reason, 'missing_confirmation_marker');
    }
  });

  await t.test('Safe handling of missing document and non-Amazon hostname', () => {
    const nullOutcome = evaluateAmazonOrderOutcome(null);
    assert.strictEqual(nullOutcome.status, 'UNCONFIRMED');
    if (nullOutcome.status === 'UNCONFIRMED') {
      assert.strictEqual(nullOutcome.reason, 'missing_document');
    }

    const externalDoc = new MockDocument();
    (externalDoc as unknown as { location: { href: string; hostname: string } }).location = {
      href: 'https://www.example.com/thankyou',
      hostname: 'www.example.com',
    };
    const externalOutcome = evaluateAmazonOrderOutcome(externalDoc as unknown as Document);
    assert.strictEqual(externalOutcome.status, 'UNCONFIRMED');
    if (externalOutcome.status === 'UNCONFIRMED') {
      assert.strictEqual(externalOutcome.reason, 'unsupported_hostname');
    }
  });
});

test('Amazon Order Outcome — Privacy and PII Protection', async (t) => {
  await t.test('Order ID in DOM is NOT extracted, parsed, or retained in outcome', () => {
    const syntheticOrderId = '402-9876543-1234567';
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou?orderId=402-9876543-1234567#receipt', [
      { id: 'header-order-placed', textContent: `Order placed! Order ID: ${syntheticOrderId}` },
      { id: 'order-number', textContent: syntheticOrderId },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    if (outcome.status === 'CONFIRMED') {
      // Confirmed URL is strictly sanitized: origin + pathname, stripping query and hash
      assert.strictEqual(outcome.evidence.confirmedUrl, 'https://www.amazon.in/gp/buy/thankyou');
      assert.strictEqual(outcome.evidence.confirmedUrl.includes(syntheticOrderId), false);
      // Outcome object does NOT contain order ID or customer info
      const outcomeString = JSON.stringify(outcome);
      assert.strictEqual(outcomeString.includes(syntheticOrderId), false);
    }
  });

  await t.test('Sensitive inputs and credentials are never queried or collected', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed' },
      { tagName: 'INPUT', attributes: { name: 'cvv', type: 'password' }, textContent: '123' },
      { tagName: 'INPUT', attributes: { name: 'otp' }, textContent: '999888' },
    ]);

    const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
    assert.strictEqual(outcome.status, 'CONFIRMED');
    const outcomeString = JSON.stringify(outcome);
    assert.strictEqual(outcomeString.includes('123'), false);
    assert.strictEqual(outcomeString.includes('999888'), false);
  });
});

test('Amazon Order Outcome — Mock Payment Service Isolation', async (t) => {
  await t.test('Amazon adapter does NOT implement createPaymentCoordinator', () => {
    assert.strictEqual(amazonCheckoutAdapter.createPaymentCoordinator, undefined);
  });

  await t.test('Amazon evaluation and guidance lifecycle never calls mockPaymentService', () => {
    let createOrderCalled = false;
    let getStatusCalled = false;
    let executeScenarioCalled = false;

    const originalCreate = mockPaymentService.createOrder;
    const originalGetStatus = mockPaymentService.getStatus;
    const originalExecute = mockPaymentService.executeScenario;

    mockPaymentService.createOrder = async () => {
      createOrderCalled = true;
      return originalCreate.call(mockPaymentService);
    };
    mockPaymentService.getStatus = async (id: string) => {
      getStatusCalled = true;
      return originalGetStatus.call(mockPaymentService, id);
    };
    mockPaymentService.executeScenario = () => {
      executeScenarioCalled = true;
      return originalExecute.call(mockPaymentService, 'immediate_success');
    };

    try {
      const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
        { id: 'header-order-placed' },
      ]);

      const outcome = evaluateAmazonOrderOutcome(doc as unknown as Document);
      assert.strictEqual(outcome.status, 'CONFIRMED');

      const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
      assert.strictEqual(controller.getState().intent, 'OUTCOME_CONFIRMED');

      // Assert complete isolation: ZERO calls to mock payment service
      assert.strictEqual(createOrderCalled, false, 'createOrder must NEVER be called for Amazon');
      assert.strictEqual(getStatusCalled, false, 'getStatus must NEVER be called for Amazon');
      assert.strictEqual(executeScenarioCalled, false, 'executeScenario must NEVER be called for Amazon');
    } finally {
      mockPaymentService.createOrder = originalCreate;
      mockPaymentService.getStatus = originalGetStatus;
      mockPaymentService.executeScenario = originalExecute;
    }
  });

  await t.test('mountAssistant on Amazon India leaves activeCoordinator strictly null', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed' },
    ]);

    const mounted = mountAssistant(doc as unknown as Document, { adapter: amazonCheckoutAdapter });
    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);
    assert.strictEqual(getActiveCoordinator(), null, 'activeCoordinator must be null on Amazon');
    assert.ok(getActiveAmazonController() !== null);

    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
  });
});

test('Amazon Order Outcome — Manual-Action Invariants', async (t) => {
  await t.test('Evaluation and controller updates never trigger .click() or .submit()', () => {
    let clickCount = 0;
    const doc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const btn = doc.getElementById('bottomSubmitOrderButtonId');
    if (btn) {
      btn.click = () => {
        clickCount++;
      };
    }

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    controller.handlePageUpdate(doc as unknown as Document);

    assert.strictEqual(clickCount, 0, 'Guidance must never trigger programmatic clicks on Amazon');
  });

  await t.test('User manual click on review button sets waiting state without advancing state', () => {
    const doc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, false);

    // User clicks manually
    controller.notifyUserAction();
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, true);

    // If page is still review page upon mutation, it remains in waiting review state
    controller.handlePageUpdate(doc as unknown as Document);
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
  });

  await t.test('Transitioning from review to confirmation URL updates intent to OUTCOME_CONFIRMED', () => {
    const reviewDoc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', reviewDoc as unknown as Document);
    controller.notifyUserAction();
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, true);

    // Amazon navigates to confirmation page with verified container
    const confirmDoc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'header-order-placed' },
    ]);

    controller.handlePageUpdate(confirmDoc as unknown as Document);
    assert.strictEqual(controller.getState().intent, 'OUTCOME_CONFIRMED');
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, false);
    assert.strictEqual(controller.getState().outcome?.status, 'CONFIRMED');
  });

  await t.test('Transitioning from review to missing container updates intent to OUTCOME_UNCONFIRMED', () => {
    const reviewDoc = createSyntheticAmazonDoc('/gp/buy/spc/handlers/display.html', [
      { id: 'bottomSubmitOrderButtonId' },
      { tagName: 'INPUT', attributes: { name: 'placeYourOrder1', type: 'submit' } },
    ]);

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', reviewDoc as unknown as Document);
    controller.notifyUserAction();

    // Navigates to thankyou but DOM marker is missing
    const unconfirmedDoc = createSyntheticAmazonDoc('/gp/buy/thankyou', [
      { id: 'random-element' },
    ]);

    controller.handlePageUpdate(unconfirmedDoc as unknown as Document);
    assert.strictEqual(controller.getState().intent, 'OUTCOME_UNCONFIRMED');
    assert.strictEqual(controller.getState().outcome?.status, 'UNCONFIRMED');
  });
});

test('Amazon Order Outcome — Multilingual Localization Alignment', async (t) => {
  const languages = ['en', 'hi', 'te'] as const;
  const outcomeKeys = [
    'amazon_outcome_confirmed',
    'amazon_outcome_unconfirmed',
    'amazon_outcome_pending',
    'amazon_outcome_failed',
  ] as const;

  for (const lang of languages) {
    for (const key of outcomeKeys) {
      const msg = getMessage(lang, key);
      assert.ok(typeof msg === 'string' && msg.length > 5, `Message for ${lang}.${key} must be valid text`);
    }
  }

  // Verify English text invariants
  const enConfirmed = getMessage('en', 'amazon_outcome_confirmed');
  assert.ok(enConfirmed.includes('confirmed'));

  const enUnconfirmed = getMessage('en', 'amazon_outcome_unconfirmed');
  assert.ok(enUnconfirmed.includes("couldn't verify"));
  assert.ok(enUnconfirmed.includes('check the status directly on Amazon'));

  const enPending = getMessage('en', 'amazon_outcome_pending');
  assert.ok(enPending.includes('processing'));

  const enFailed = getMessage('en', 'amazon_outcome_failed');
  assert.ok(enFailed.includes('issue completing your order'));
});
