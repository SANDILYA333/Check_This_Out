import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  amazonCheckoutAdapter,
} from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import {
  AmazonGuidanceController,
  mapObservationToIntent,
} from '../../src/content/assistant/amazonGuidanceController.ts';
import { AmazonActionObserver } from '../../src/content/assistant/amazonActionObserver.ts';
import { TargetHighlighter } from '../../src/content/assistant/highlighter.ts';
import { getMessage } from '../../src/localization/index.ts';

function createSyntheticDoc(
  url: string,
  elementInits: Array<{ tagName?: string; id?: string; attributes?: Record<string, string> }> = []
): MockDocument {
  const doc = new MockDocument();
  (doc as unknown as { URL: string }).URL = url;
  (doc as unknown as { location: { href: string; hostname: string; pathname: string } }).location = {
    href: url,
    hostname: new URL(url).hostname,
    pathname: new URL(url).pathname,
  };

  for (const init of elementInits) {
    const el = new MockHTMLElement(init);
    doc.body.appendChild(el);
  }

  return doc;
}

test('Amazon Guidance — Observation Mapping to Guidance Intent', async (t) => {
  await t.test('CART observation maps to GUIDE_CART with step 1 of 4 and proceed-to-buy target', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'CART' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'GUIDE_CART');
    assert.strictEqual(mapped.targetId, 'amazon-proceed-to-buy');
    assert.strictEqual(mapped.stepNumber, 1);
    assert.strictEqual(mapped.totalSteps, 4);
  });

  await t.test('ADDRESS_SELECTION maps to GUIDE_ADDRESS_SELECTION with step 2 of 4', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'ADDRESS_SELECTION' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'GUIDE_ADDRESS_SELECTION');
    assert.strictEqual(mapped.targetId, 'amazon-select-address');
    assert.strictEqual(mapped.stepNumber, 2);
    assert.strictEqual(mapped.totalSteps, 4);
  });

  await t.test('PAYMENT_SELECTION maps to GUIDE_PAYMENT_SELECTION with step 3 of 4', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'PAYMENT_SELECTION' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'GUIDE_PAYMENT_SELECTION');
    assert.strictEqual(mapped.targetId, 'amazon-select-payment');
    assert.strictEqual(mapped.stepNumber, 3);
    assert.strictEqual(mapped.totalSteps, 4);
  });

  await t.test('ORDER_REVIEW maps to GUIDE_ORDER_REVIEW with step 4 of 4', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'ORDER_REVIEW' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(mapped.targetId, 'amazon-place-order');
    assert.strictEqual(mapped.stepNumber, 4);
    assert.strictEqual(mapped.totalSteps, 4);
  });

  await t.test('EMPTY_CART maps to PAUSED_EMPTY_CART with no target', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'EMPTY_CART' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'PAUSED_EMPTY_CART');
    assert.strictEqual(mapped.targetId, null);
  });

  await t.test('AUTH_REQUIRED maps to PAUSED_AUTH_REQUIRED with no target', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'AUTH_REQUIRED' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'PAUSED_AUTH_REQUIRED');
    assert.strictEqual(mapped.targetId, null);
  });

  await t.test('SECURITY_CHALLENGE maps to PAUSED_SECURITY_CHALLENGE with no target', () => {
    const observation = { supported: true, siteId: 'amazon_in' as const, pageState: 'SECURITY_CHALLENGE' };
    const mapped = mapObservationToIntent(observation);

    assert.strictEqual(mapped.intent, 'PAUSED_SECURITY_CHALLENGE');
    assert.strictEqual(mapped.targetId, null);
  });

  await t.test('UNVERIFIED and UNSUPPORTED map to paused states without target', () => {
    assert.strictEqual(
      mapObservationToIntent({ supported: false, siteId: 'amazon_in', pageState: 'UNVERIFIED' }).intent,
      'PAUSED_UNVERIFIED'
    );
    assert.strictEqual(
      mapObservationToIntent({ supported: false, siteId: 'amazon_in', pageState: 'UNSUPPORTED' }).intent,
      'PAUSED_UNSUPPORTED'
    );
  });
});

test('Amazon Action Observation & Step Transition Guarantees', async (t) => {
  await t.test('CRITICAL RULE: User click on target does NOT automatically advance step; sets waiting state', () => {
    const doc = createSyntheticDoc(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);
    highlighter.update(controller.getState().targetId, doc as unknown as Document);

    const observer = new AmazonActionObserver({
      controller,
      highlighter,
      adapter: amazonCheckoutAdapter,
      doc: doc as unknown as Document,
    });

    assert.strictEqual(controller.getState().intent, 'GUIDE_CART');
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, false);

    // Simulate user clicking the verified Proceed to Buy button
    const proceedBtn = doc.querySelector('input[name="proceedToRetailCheckout"]') as unknown as HTMLElement;
    doc.dispatchEvent({
      type: 'click',
      target: proceedBtn,
    });

    // Invariant: Stage did NOT change; only waiting state is flagged
    assert.strictEqual(controller.getState().intent, 'GUIDE_CART');
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, true);

    observer.disconnect();
    highlighter.destroy();
    controller.destroy();
  });

  await t.test('Page evidence advances guidance: Mutation observer updates intent when DOM actually changes', () => {
    const doc = createSyntheticDoc(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);
    highlighter.update(controller.getState().targetId, doc as unknown as Document);

    const observer = new AmazonActionObserver({
      controller,
      highlighter,
      adapter: amazonCheckoutAdapter,
      doc: doc as unknown as Document,
    });

    // User clicked button, waiting state set
    controller.notifyUserAction();
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, true);

    // Amazon navigates/updates DOM to address selection
    (doc as unknown as { URL: string }).URL = 'https://www.amazon.in/gp/buy/addressselect/handlers/display.html';
    (doc as unknown as { location: { href: string; hostname: string; pathname: string } }).location = {
      href: 'https://www.amazon.in/gp/buy/addressselect/handlers/display.html',
      hostname: 'www.amazon.in',
      pathname: '/gp/buy/addressselect/handlers/display.html',
    };
    doc.body.children = [];
    const addressBtn = new MockHTMLElement({
      tagName: 'input',
      attributes: { 'data-testid': 'Address_selectShipToThisAddress' },
    });
    doc.body.appendChild(addressBtn);

    // Trigger DOM mutation notification
    observer.handleDomMutation();

    // Guidance now advances to ADDRESS_SELECTION and clears waiting state
    assert.strictEqual(controller.getState().intent, 'GUIDE_ADDRESS_SELECTION');
    assert.strictEqual(controller.getState().stepNumber, 2);
    assert.strictEqual(controller.getState().isWaitingForPageUpdate, false);
    assert.strictEqual(highlighter.getHighlightedElement(), addressBtn as unknown as HTMLElement);

    observer.disconnect();
    highlighter.destroy();
    controller.destroy();
  });

  await t.test('Language switching preserves current Amazon guidance intent and step', () => {
    const doc = createSyntheticDoc(
      'https://www.amazon.in/gp/buy/spc/handlers/display.html',
      [{ tagName: 'input', attributes: { name: 'placeYourOrder1' } }]
    );

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller.getState().language, 'en');

    // Switch to Telugu
    controller.setLanguage('te');
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller.getState().language, 'te');
    assert.strictEqual(controller.getState().stepNumber, 4);

    // Switch to Hindi
    controller.setLanguage('hi');
    assert.strictEqual(controller.getState().intent, 'GUIDE_ORDER_REVIEW');
    assert.strictEqual(controller.getState().language, 'hi');

    controller.destroy();
  });
});

test('Amazon Guidance — Localization & Isolation Guarantees', async (t) => {
  await t.test('Amazon instruction messages are available and non-empty across all 3 languages', () => {
    const keys = [
      'amazon_cart_instruction',
      'amazon_address_instruction',
      'amazon_payment_instruction',
      'amazon_review_instruction',
      'amazon_empty_cart_instruction',
      'amazon_auth_instruction',
      'amazon_challenge_instruction',
      'amazon_waiting_update',
      'amazon_unverified_instruction',
    ] as const;

    for (const key of keys) {
      for (const lang of ['en', 'hi', 'te'] as const) {
        const msg = getMessage(lang, key);
        assert.ok(typeof msg === 'string' && msg.length > 5, `Message for ${key} in ${lang} must be valid`);
      }
    }
  });

  await t.test('PAYMENT ISOLATION: Amazon controller never references transaction IDs or mock PSP', () => {
    const doc = createSyntheticDoc(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    const state = controller.getState();

    // Verify there are no transaction IDs, payment coordinators, or mock simulation states
    assert.strictEqual((state as unknown as { transactionId?: unknown }).transactionId, undefined);
    assert.strictEqual((state as unknown as { paymentStatus?: unknown }).paymentStatus, undefined);
    assert.strictEqual(amazonCheckoutAdapter.createPaymentCoordinator, undefined);

    controller.destroy();
  });

  await t.test('READ-ONLY INVARIANT: Guidance and observation path never triggers click, submit, or PII extraction', () => {
    let clickCalled = false;
    let submitCalled = false;

    const doc = createSyntheticDoc('https://www.amazon.in/gp/cart/view.html');
    const btn = new MockHTMLElement({
      tagName: 'input',
      attributes: { name: 'proceedToRetailCheckout', type: 'submit' },
    });
    btn.click = () => {
      clickCalled = true;
    };
    (btn as unknown as { submit: () => void }).submit = () => {
      submitCalled = true;
    };
    doc.body.appendChild(btn);

    const controller = new AmazonGuidanceController(amazonCheckoutAdapter, 'en', doc as unknown as Document);
    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);
    const observer = new AmazonActionObserver({
      controller,
      highlighter,
      adapter: amazonCheckoutAdapter,
      doc: doc as unknown as Document,
    });

    // Execute state checks and updates
    controller.handlePageUpdate(doc as unknown as Document);
    highlighter.update(controller.getState().targetId, doc as unknown as Document);

    // Verify zero automated actions
    assert.strictEqual(clickCalled, false);
    assert.strictEqual(submitCalled, false);

    observer.disconnect();
    highlighter.destroy();
    controller.destroy();
  });
});
