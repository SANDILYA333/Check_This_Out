import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  shopsphereCheckoutAdapter,
  ShopSphereCheckoutAdapter,
} from '../../src/content/adapters/shopsphereCheckoutAdapter.ts';
import { amazonCheckoutAdapter } from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import { demoCheckoutAdapter } from '../../src/content/adapters/demoCheckoutAdapter.ts';
import {
  resolveAdapter,
  registerAdapter,
  unregisterAdapter,
  resetAdapterRegistry,
  getRegisteredAdapters,
} from '../../src/content/adapters/pageAdapterRegistry.ts';
import { ShopSphereGuidanceController } from '../../src/content/assistant/shopsphereGuidanceController.ts';
import type { TargetId } from '../../src/guidance/types.ts';

function createShopSphereDoc(page = 'landing', state = ''): MockDocument {
  const doc = new MockDocument();
  const root = new MockHTMLElement({
    id: 'shopsphere-root',
    attributes: { 'data-vc-store': 'shopsphere' },
  });
  doc.body.appendChild(root);
  doc.body.setAttribute('data-vc-page', page);
  if (state) {
    doc.body.setAttribute('data-vc-state', state);
  }
  return doc;
}

test('ShopSphere Checkout Adapter — Detection, State Observation, and Contract', async (t) => {
  t.beforeEach(() => {
    resetAdapterRegistry();
  });

  t.afterEach(() => {
    resetAdapterRegistry();
  });

  await t.test('conforms to SiteAdapter contract', () => {
    assert.strictEqual(shopsphereCheckoutAdapter.siteId, 'shopsphere-demo');
    assert.strictEqual(shopsphereCheckoutAdapter.name, 'ShopSphere Demo Store');
    assert.strictEqual(typeof shopsphereCheckoutAdapter.detectPage, 'function');
    assert.strictEqual(typeof shopsphereCheckoutAdapter.observePageState, 'function');
    assert.strictEqual(typeof shopsphereCheckoutAdapter.lookupTarget, 'function');
    assert.strictEqual(typeof shopsphereCheckoutAdapter.dispose, 'function');
    assert.strictEqual(typeof shopsphereCheckoutAdapter.createPaymentCoordinator, 'function');
  });

  await t.test('detectPage detects supported ShopSphere document via #shopsphere-root', () => {
    const doc = createShopSphereDoc();
    const result = shopsphereCheckoutAdapter.detectPage(doc as unknown as Document);
    assert.strictEqual(result.supported, true);
    assert.strictEqual(result.siteId, 'shopsphere-demo');
  });

  await t.test('detectPage detects supported ShopSphere document via data-vc-page', () => {
    const doc = new MockDocument();
    doc.body.setAttribute('data-vc-page', 'cart');
    const result = shopsphereCheckoutAdapter.detectPage(doc as unknown as Document);
    assert.strictEqual(result.supported, true);
    assert.strictEqual(result.siteId, 'shopsphere-demo');
  });

  await t.test('detectPage rejects empty or unsupported documents', () => {
    const emptyDoc = new MockDocument();
    const nullResult = shopsphereCheckoutAdapter.detectPage(null);
    assert.strictEqual(nullResult.supported, false);

    const emptyResult = shopsphereCheckoutAdapter.detectPage(emptyDoc as unknown as Document);
    assert.strictEqual(emptyResult.supported, false);
  });

  await t.test('detectPage rejects Amazon document and prevents cross-detection', () => {
    const amazonDoc = new MockDocument();
    const navCart = new MockHTMLElement({ id: 'nav-cart' });
    amazonDoc.body.appendChild(navCart);

    const result = shopsphereCheckoutAdapter.detectPage(amazonDoc as unknown as Document);
    assert.strictEqual(result.supported, false);

    // Verify Amazon adapter also rejects ShopSphere
    const shopDoc = createShopSphereDoc();
    const amazonResult = amazonCheckoutAdapter.detectPage(shopDoc as unknown as Document);
    assert.strictEqual(amazonResult.supported, false);
  });

  await t.test('observePageState classifies all supported storefront stages', () => {
    const testCases: Array<{ page: string; state?: string; expected: string }> = [
      { page: 'landing', expected: 'LANDING' },
      { page: 'product-detail', expected: 'PRODUCT_DETAILS' },
      { page: 'cart', expected: 'CART' },
      { page: 'cart', state: 'empty', expected: 'EMPTY_CART' },
      { page: 'address', expected: 'ADDRESS_SELECTION' },
      { page: 'delivery', expected: 'DELIVERY_SELECTION' },
      { page: 'payment', expected: 'PAYMENT_SELECTION' },
      { page: 'review', expected: 'ORDER_REVIEW' },
      { page: 'demo-payment', expected: 'DEMO_PAYMENT' },
      { page: 'order-result', state: 'confirmed', expected: 'ORDER_CONFIRMED' },
      { page: 'order-result', state: 'failed', expected: 'PAYMENT_FAILED' },
      { page: 'order-result', state: 'pending', expected: 'PAYMENT_PENDING' },
      { page: 'order-result', state: 'unconfirmed', expected: 'RESULT_UNCONFIRMED' },
    ];

    for (const tc of testCases) {
      const doc = createShopSphereDoc(tc.page, tc.state);
      const obs = shopsphereCheckoutAdapter.observePageState(doc as unknown as Document);
      assert.strictEqual(obs.supported, true);
      assert.strictEqual(obs.siteId, 'shopsphere-demo');
      assert.strictEqual(obs.pageState, tc.expected, `Expected ${tc.expected} for page=${tc.page}, state=${tc.state}`);
    }
  });

  await t.test('observePageState returns unsupported on non-ShopSphere document', () => {
    const doc = new MockDocument();
    const obs = shopsphereCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, false);
    assert.strictEqual(obs.siteId, 'unsupported');
  });
});

test('ShopSphere Target Lookup — Verified, Missing, Hidden, Disabled, Ambiguous', async (t) => {
  await t.test('returns verified for uniquely rendered visible target', () => {
    const doc = createShopSphereDoc();
    const btn = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'hero-shop' },
    });
    doc.body.appendChild(btn);

    const res = shopsphereCheckoutAdapter.lookupTarget('hero-shop' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'verified');
    if (res.status === 'verified') {
      assert.strictEqual(res.targetId, 'hero-shop');
      assert.strictEqual(res.element, btn as unknown as HTMLElement);
    }
  });

  await t.test('returns missing when target does not exist', () => {
    const doc = createShopSphereDoc();
    const res = shopsphereCheckoutAdapter.lookupTarget('proceed-to-checkout' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'missing');
    assert.strictEqual(res.targetId, 'proceed-to-checkout');
  });

  await t.test('returns hidden when target is display: none', () => {
    const doc = createShopSphereDoc();
    const btn = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'cart' },
      style: { display: 'none' },
    });
    doc.body.appendChild(btn);

    const res = shopsphereCheckoutAdapter.lookupTarget('cart' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'hidden');
    assert.strictEqual(res.targetId, 'cart');
  });

  await t.test('returns disabled when target button is disabled', () => {
    const doc = createShopSphereDoc();
    const btn = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'confirm-address' },
      disabled: true,
    });
    doc.body.appendChild(btn);

    const res = shopsphereCheckoutAdapter.lookupTarget('confirm-address' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'disabled');
    assert.strictEqual(res.targetId, 'confirm-address');
  });

  await t.test('returns ambiguous when multiple identical targets exist', () => {
    const doc = createShopSphereDoc();
    const btn1 = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'add-to-cart' },
    });
    const btn2 = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'add-to-cart' },
    });
    doc.body.appendChild(btn1);
    doc.body.appendChild(btn2);

    const res = shopsphereCheckoutAdapter.lookupTarget('add-to-cart' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'ambiguous');
    if (res.status === 'ambiguous') {
      assert.strictEqual(res.targetId, 'add-to-cart');
      assert.strictEqual(res.count, 2);
    }
  });

  await t.test('SAFETY INVARIANT: lookupTarget is strictly read-only and never clicks', () => {
    const doc = createShopSphereDoc();
    const btn = new MockHTMLElement({
      tagName: 'BUTTON',
      attributes: { 'data-vc-target': 'simulate-payment-success' },
    });
    doc.body.appendChild(btn);

    const res = shopsphereCheckoutAdapter.lookupTarget('simulate-payment-success' as TargetId, doc as unknown as Document);
    assert.strictEqual(res.status, 'verified');
    assert.strictEqual(btn.clickedCount, 0, 'Target must NEVER be clicked by lookup');
  });
});

test('ShopSphere Guidance Controller — State Mapping, Language Switching, and Subscriptions', async (t) => {
  await t.test('maps all page states to appropriate instruction message keys and targets', () => {
    const doc = createShopSphereDoc();
    const controller = new ShopSphereGuidanceController(shopsphereCheckoutAdapter, 'en', doc as unknown as Document);

    controller.updatePageState('LANDING');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_landing_instruction');
    assert.strictEqual(controller.getState().targetId, 'hero-shop');

    controller.updatePageState('PRODUCT_DETAILS');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_product_instruction');
    assert.strictEqual(controller.getState().targetId, 'add-to-cart');

    controller.updatePageState('CART');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_cart_instruction');
    assert.strictEqual(controller.getState().targetId, 'proceed-to-checkout');

    controller.updatePageState('EMPTY_CART');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_empty_cart_instruction');
    assert.strictEqual(controller.getState().targetId, 'continue-shopping');

    controller.updatePageState('ADDRESS_SELECTION');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_address_instruction');
    assert.strictEqual(controller.getState().targetId, 'confirm-address');

    controller.updatePageState('DELIVERY_SELECTION');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_delivery_instruction');
    assert.strictEqual(controller.getState().targetId, 'confirm-delivery');

    controller.updatePageState('PAYMENT_SELECTION');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_payment_instruction');
    assert.strictEqual(controller.getState().targetId, 'confirm-payment-method');

    controller.updatePageState('ORDER_REVIEW');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_review_instruction');
    assert.strictEqual(controller.getState().targetId, 'confirm-order-review');

    controller.updatePageState('DEMO_PAYMENT');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_demo_payment_instruction');
    assert.strictEqual(controller.getState().targetId, 'simulate-payment-success');

    controller.updatePageState('ORDER_CONFIRMED');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_confirmed_instruction');
    assert.strictEqual(controller.getState().targetId, 'continue-shopping');

    controller.updatePageState('PAYMENT_FAILED');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_failed_instruction');
    assert.strictEqual(controller.getState().targetId, 'retry-payment');

    controller.updatePageState('PAYMENT_PENDING');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_pending_instruction');
    assert.strictEqual(controller.getState().targetId, 'recheck-status');

    controller.updatePageState('RESULT_UNCONFIRMED');
    assert.strictEqual(controller.getState().instructionKey, 'shopsphere_unconfirmed_instruction');
    assert.strictEqual(controller.getState().targetId, 'continue-shopping');
  });

  await t.test('language switching preserves active page state and targets', () => {
    const doc = createShopSphereDoc();
    const controller = new ShopSphereGuidanceController(shopsphereCheckoutAdapter, 'en', doc as unknown as Document);
    controller.updatePageState('ORDER_REVIEW');

    controller.setLanguage('hi');
    assert.strictEqual(controller.getState().language, 'hi');
    assert.strictEqual(controller.getState().pageState, 'ORDER_REVIEW');
    assert.strictEqual(controller.getState().targetId, 'confirm-order-review');

    controller.setLanguage('te');
    assert.strictEqual(controller.getState().language, 'te');
    assert.strictEqual(controller.getState().pageState, 'ORDER_REVIEW');
  });

  await t.test('subscriptions receive state updates and unsubscribe cleanly', () => {
    const doc = createShopSphereDoc();
    const controller = new ShopSphereGuidanceController(shopsphereCheckoutAdapter, 'en', doc as unknown as Document);
    let callCount = 0;
    const unsubscribe = controller.subscribe(() => {
      callCount++;
    });

    // Initial notification on subscribe
    assert.strictEqual(callCount, 1);

    controller.updatePageState('CART');
    assert.strictEqual(callCount, 2);

    controller.setLanguage('hi');
    assert.strictEqual(callCount, 3);

    unsubscribe();
    controller.updatePageState('LANDING');
    assert.strictEqual(callCount, 3, 'Listener must not be called after unsubscribe');
  });
});

test('Adapter Registry Resolution — Dynamic Registration and Precedence', async (t) => {
  t.beforeEach(() => {
    resetAdapterRegistry();
  });

  t.afterEach(() => {
    resetAdapterRegistry();
  });

  await t.test('registers ShopSphere adapter and resolves it cleanly', () => {
    registerAdapter(shopsphereCheckoutAdapter);

    const doc = createShopSphereDoc();
    const resolved = resolveAdapter(doc as unknown as Document);
    assert.ok(resolved);
    assert.strictEqual(resolved?.siteId, 'shopsphere-demo');
    assert.strictEqual(resolved?.name, 'ShopSphere Demo Store');
  });

  await t.test('resolves demo adapter for demo document when both are registered', () => {
    registerAdapter(shopsphereCheckoutAdapter);

    const demoDoc = new MockDocument();
    demoDoc.body.setAttribute('data-voicecheckout-demo', 'true');
    const total = new MockHTMLElement({ attributes: { 'data-testid': 'checkout-total' } });
    demoDoc.body.appendChild(total);

    const resolved = resolveAdapter(demoDoc as unknown as Document);
    assert.ok(resolved);
    assert.strictEqual(resolved?.siteId, 'demo');
  });

  await t.test('unregisterAdapter removes ShopSphere cleanly', () => {
    registerAdapter(shopsphereCheckoutAdapter);
    unregisterAdapter('shopsphere-demo');

    const doc = createShopSphereDoc();
    const resolved = resolveAdapter(doc as unknown as Document);
    assert.strictEqual(resolved, null);
  });
});
