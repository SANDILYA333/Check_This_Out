import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  amazonCheckoutAdapter,
  AmazonCheckoutAdapter,
  extractDocumentUrl,
} from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import {
  resolveAdapter,
  resetAdapterRegistry,
} from '../../src/content/adapters/pageAdapterRegistry.ts';
import {
  mountAssistant,
  unmountAssistant,
  isAssistantMounted,
  getActiveCoordinator,
} from '../../src/content/assistant/lifecycle.ts';

/**
 * Creates a synthetic MockDocument representing an Amazon India page.
 * NOTE: All fixtures in this suite are synthetic models constructed from
 * technical discovery and public specifications; they are not live captured pages.
 */
function createSyntheticAmazonDocument(
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

test('Amazon India Adapter — Hostname and Route Recognition', async (t) => {
  await t.test('Accepts exact hostname www.amazon.in', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );
    const detection = amazonCheckoutAdapter.detectPage(doc as unknown as Document);
    assert.strictEqual(detection.supported, true);
    assert.strictEqual(detection.siteId, 'amazon_in');
  });

  await t.test('Rejects non-matching or lookalike hostnames', () => {
    const lookalikes = [
      'https://amazon.in/gp/cart/view.html', // Missing www.
      'https://fake-amazon.in/gp/cart/view.html',
      'https://www.amazon.in.phishing.com/gp/cart',
      'https://www.amazon.com/gp/cart',
      'https://pay.amazon.in/checkout',
      'https://payments.amazon.in/checkout',
      'http://localhost:3000/gp/cart',
    ];

    for (const url of lookalikes) {
      const doc = createSyntheticAmazonDocument(url, [
        { tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } },
      ]);
      const res = amazonCheckoutAdapter.detectPage(doc as unknown as Document);
      assert.strictEqual(res.supported, false);
      assert.strictEqual(res.reason, 'unsupported_hostname');
    }
  });

  await t.test('Rejects non-checkout Amazon India pages', () => {
    const nonCheckoutUrls = [
      'https://www.amazon.in/dp/B08XYZ1234', // Product Detail
      'https://www.amazon.in/gp/product/B08XYZ1234',
      'https://www.amazon.in/s?k=pressure+cooker', // Search
      'https://www.amazon.in/', // Home
      'https://www.amazon.in/gp/css/order-history', // Orders
      'https://www.amazon.in/your-account', // Account
    ];

    for (const url of nonCheckoutUrls) {
      const doc = createSyntheticAmazonDocument(url);
      const res = amazonCheckoutAdapter.detectPage(doc as unknown as Document);
      assert.strictEqual(res.supported, false);
      assert.strictEqual(res.reason, 'unsupported_amazon_page');

      const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
      assert.strictEqual(obs.supported, false);
      assert.strictEqual(obs.pageState, 'UNSUPPORTED');
    }
  });

  await t.test('Safely handles missing or malformed documents and URLs', () => {
    assert.strictEqual(amazonCheckoutAdapter.detectPage(null).supported, false);
    assert.strictEqual(amazonCheckoutAdapter.detectPage(null).reason, 'missing_document');
    assert.strictEqual(amazonCheckoutAdapter.detectPage(undefined).supported, false);

    const emptyDoc = new MockDocument();
    assert.strictEqual(amazonCheckoutAdapter.detectPage(emptyDoc as unknown as Document).supported, false);
    assert.strictEqual(amazonCheckoutAdapter.detectPage(emptyDoc as unknown as Document).reason, 'missing_url');
  });
});

test('Amazon India Adapter — Page-State Classification via Synthetic Fixtures', async (t) => {
  await t.test('Classifies CART with proceed button', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'CART');
  });

  await t.test('Classifies EMPTY_CART when empty cart marker is present', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'div', id: 'sc-empty-cart' },
    ]);
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'EMPTY_CART');
  });

  await t.test('Distinguishes unverified cart when controls are missing (loading or unfamiliar layout)', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', []);
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.pageState, 'UNVERIFIED');
    assert.strictEqual(obs.unverifiedReason, 'Cart page missing verified proceed or empty-cart control');
  });

  await t.test('Returns UNVERIFIED on conflicting cart markers (both active and empty markers)', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'div', id: 'sc-empty-cart' },
      { tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } },
    ]);
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.pageState, 'UNVERIFIED');
    assert.strictEqual(
      obs.unverifiedReason,
      'Conflicting cart DOM signals (both active and empty markers present)'
    );
  });

  await t.test('Classifies ADDRESS_SELECTION on address route with address marker', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/addressselect/handlers/display.html',
      [{ tagName: 'button', attributes: { 'data-testid': 'Address_selectShipToThisAddress' } }]
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'ADDRESS_SELECTION');
  });

  await t.test('Returns UNVERIFIED on address route without address markers', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/addressselect/handlers/display.html',
      []
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.pageState, 'UNVERIFIED');
  });

  await t.test('Classifies PAYMENT_SELECTION on payselect route with payment marker', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/payselect/handlers/display.html',
      [{ tagName: 'form', id: 'payselectForm' }]
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'PAYMENT_SELECTION');
  });

  await t.test('Classifies ORDER_REVIEW on spc route with place-order marker', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/spc/handlers/display.html',
      [{ tagName: 'input', attributes: { name: 'placeYourOrder1' } }]
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'ORDER_REVIEW');
  });

  await t.test('Classifies ORDER_CONFIRMATION on thankyou route with confirmation marker', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/thankyou/handlers/display.html',
      [{ tagName: 'div', id: 'thankYouPage' }]
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.pageState, 'ORDER_CONFIRMATION');
  });

  await t.test('Returns UNVERIFIED on thankyou route missing confirmation container (ambiguous redirect)', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/thankyou/handlers/display.html',
      []
    );
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.pageState, 'UNVERIFIED');
    assert.strictEqual(
      obs.unverifiedReason,
      'Confirmation URL without verified order confirmation banner'
    );
  });

  await t.test('Classifies AUTH_REQUIRED on signin route or when signin form is present', () => {
    const doc1 = createSyntheticAmazonDocument('https://www.amazon.in/ap/signin', []);
    const obs1 = amazonCheckoutAdapter.observePageState(doc1 as unknown as Document);
    assert.strictEqual(obs1.supported, true);
    assert.strictEqual(obs1.pageState, 'AUTH_REQUIRED');

    // Signin form present even on another URL
    const doc2 = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'form', id: 'ap_signin_form' },
    ]);
    const obs2 = amazonCheckoutAdapter.observePageState(doc2 as unknown as Document);
    assert.strictEqual(obs2.supported, true);
    assert.strictEqual(obs2.pageState, 'AUTH_REQUIRED');
  });

  await t.test('Classifies SECURITY_CHALLENGE on captcha route or when captcha form is present', () => {
    const doc1 = createSyntheticAmazonDocument(
      'https://www.amazon.in/errors/validateCaptcha',
      []
    );
    const obs1 = amazonCheckoutAdapter.observePageState(doc1 as unknown as Document);
    assert.strictEqual(obs1.supported, true);
    assert.strictEqual(obs1.pageState, 'SECURITY_CHALLENGE');

    // Captcha form present on cart route
    const doc2 = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'form', attributes: { action: '/errors/validateCaptcha' } },
    ]);
    const obs2 = amazonCheckoutAdapter.observePageState(doc2 as unknown as Document);
    assert.strictEqual(obs2.supported, true);
    assert.strictEqual(obs2.pageState, 'SECURITY_CHALLENGE');
  });

  await t.test('Returns UNVERIFIED on URL/DOM conflict (e.g. cart URL with confirmation marker)', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html', [
      { tagName: 'div', id: 'thankYouPage' },
    ]);
    const obs = amazonCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.pageState, 'UNVERIFIED');
    assert.strictEqual(
      obs.unverifiedReason,
      'URL and DOM conflict (cart URL with checkout/confirmation markers)'
    );
  });
});

test('Amazon India Adapter — Registry Resolution and Safety Isolation', async (t) => {
  t.beforeEach(() => {
    resetAdapterRegistry();
    unmountAssistant();
  });

  t.afterEach(() => {
    resetAdapterRegistry();
    unmountAssistant();
  });

  await t.test('Registry resolves amazonCheckoutAdapter on valid Amazon checkout page', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );
    const adapter = resolveAdapter(doc as unknown as Document);
    assert.ok(adapter);
    assert.strictEqual(adapter?.siteId, 'amazon_in');
  });

  await t.test('Controlled demo still resolves to demoCheckoutAdapter', () => {
    const demoDoc = new MockDocument();
    demoDoc.body.setAttribute('data-voicecheckout-demo', 'true');
    const total = new MockHTMLElement({ attributes: { 'data-testid': 'checkout-total' } });
    demoDoc.body.appendChild(total);

    const adapter = resolveAdapter(demoDoc as unknown as Document);
    assert.ok(adapter);
    assert.strictEqual(adapter?.siteId, 'demo');
  });

  await t.test('Registration order cannot cause demo or Amazon pages to be confused', () => {
    // Both adapters registered
    const demoDoc = new MockDocument();
    demoDoc.body.setAttribute('data-voicecheckout-demo', 'true');
    demoDoc.body.appendChild(new MockHTMLElement({ attributes: { 'data-testid': 'checkout-total' } }));

    const amazonDoc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/spc/handlers/display.html',
      [{ tagName: 'input', attributes: { name: 'placeYourOrder1' } }]
    );

    assert.strictEqual(resolveAdapter(demoDoc as unknown as Document)?.siteId, 'demo');
    assert.strictEqual(resolveAdapter(amazonDoc as unknown as Document)?.siteId, 'amazon_in');
  });

  await t.test('CRITICAL PAYMENT BOUNDARY: amazonCheckoutAdapter has NO mock payment coordinator', () => {
    assert.strictEqual(amazonCheckoutAdapter.createPaymentCoordinator, undefined);

    const amazonDoc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    let customRenderCalled = false;
    const mounted = mountAssistant(amazonDoc as unknown as Document, {
      render: () => {
        customRenderCalled = true;
        return { unmount: () => {} };
      },
    });

    assert.strictEqual(mounted, true);
    assert.strictEqual(customRenderCalled, true);
    // Guarantees zero mock payment coordinator instantiated on Amazon
    assert.strictEqual(getActiveCoordinator(), null);

    unmountAssistant(amazonDoc as unknown as Document);
  });

  await t.test('CRITICAL GUIDANCE GUARD: Amazon mounting uses isolated Amazon assistant with ZERO mock payment coordinator', () => {
    const amazonDoc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    // Call mountAssistant on Amazon page
    const mounted = mountAssistant(amazonDoc as unknown as Document);
    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);
    // Guarantees demo mock payment coordinator is NEVER instantiated on Amazon
    assert.strictEqual(getActiveCoordinator(), null);

    unmountAssistant(amazonDoc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
  });

  await t.test('TARGET LOOKUP INVARIANT: lookupTarget returns unsupported_page on Amazon in Milestone 3', () => {
    const amazonDoc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html');
    const result = amazonCheckoutAdapter.lookupTarget('checkout-root', amazonDoc as unknown as Document);
    assert.strictEqual(result.status, 'unsupported_page');
    assert.strictEqual(result.targetId, 'checkout-root');
  });

  await t.test('READ-ONLY SAFETY INVARIANT: detectPage and observePageState never mutate DOM or trigger actions', () => {
    let clickCalled = false;
    let submitCalled = false;

    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html');
    const btn = new MockHTMLElement({
      tagName: 'INPUT',
      attributes: { name: 'proceedToRetailCheckout', type: 'submit', value: 'Proceed' },
    });

    btn.click = () => {
      clickCalled = true;
    };
    (btn as unknown as { submit: () => void }).submit = () => {
      submitCalled = true;
    };

    doc.body.appendChild(btn);

    const initialAttrCount = doc.body.attributes.size;
    const initialChildrenCount = doc.body.children.length;
    const initialUrl = (doc as unknown as { URL: string }).URL;

    // Execute detection & observation
    const detection = amazonCheckoutAdapter.detectPage(doc as unknown as Document);
    const observation = amazonCheckoutAdapter.observePageState(doc as unknown as Document);

    assert.strictEqual(detection.supported, true);
    assert.strictEqual(observation.pageState, 'CART');

    // Verify read-only invariants: zero clicks, zero submits, zero DOM or URL mutation
    assert.strictEqual(clickCalled, false);
    assert.strictEqual(submitCalled, false);
    assert.strictEqual(doc.body.attributes.size, initialAttrCount);
    assert.strictEqual(doc.body.children.length, initialChildrenCount);
    assert.strictEqual((doc as unknown as { URL: string }).URL, initialUrl);
  });
});
