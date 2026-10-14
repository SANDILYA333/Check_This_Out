import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  demoCheckoutAdapter,
  DemoCheckoutAdapter,
} from '../../src/content/adapters/demoCheckoutAdapter.ts';
import {
  resolveAdapter,
  registerAdapter,
  unregisterAdapter,
  getRegisteredAdapters,
  resetAdapterRegistry,
} from '../../src/content/adapters/pageAdapterRegistry.ts';
import type {
  PageObservation,
  PageSupportResult,
  SiteAdapter,
} from '../../src/content/adapters/types.ts';
import {
  mountAssistant,
  unmountAssistant,
  isAssistantMounted,
  getActiveAdapter,
  getActiveCoordinator,
  getActiveController,
} from '../../src/content/assistant/lifecycle.ts';
import { PaymentCoordinator } from '../../src/payments/paymentCoordinator.ts';

function createSupportedDocument(): MockDocument {
  const doc = new MockDocument();
  doc.body.setAttribute('data-voicecheckout-demo', 'true');
  const total = new MockHTMLElement({
    attributes: { 'data-testid': 'checkout-total' },
  });
  doc.body.appendChild(total);
  return doc;
}

test('Site Adapter and Registry — Contract, Resolution, and Payment Boundary', async (t) => {
  t.beforeEach(() => {
    resetAdapterRegistry();
    unmountAssistant();
  });

  t.afterEach(() => {
    resetAdapterRegistry();
    unmountAssistant();
  });

  await t.test('DemoCheckoutAdapter conforms to SiteAdapter contract', () => {
    assert.strictEqual(demoCheckoutAdapter.siteId, 'demo');
    assert.strictEqual(demoCheckoutAdapter.name, 'Controlled Demo Store');
    assert.strictEqual(typeof demoCheckoutAdapter.detectPage, 'function');
    assert.strictEqual(typeof demoCheckoutAdapter.observePageState, 'function');
    assert.strictEqual(typeof demoCheckoutAdapter.lookupTarget, 'function');
    assert.strictEqual(typeof demoCheckoutAdapter.dispose, 'function');
    assert.strictEqual(typeof demoCheckoutAdapter.createPaymentCoordinator, 'function');
  });

  await t.test('DemoCheckoutAdapter detects supported demo page and rejects non-demo pages', () => {
    const doc = createSupportedDocument();
    const supportedResult = demoCheckoutAdapter.detectPage(doc as unknown as Document);
    assert.strictEqual(supportedResult.supported, true);
    assert.strictEqual(supportedResult.siteId, 'demo');

    const unsupportedDoc = new MockDocument();
    const unsupportedResult = demoCheckoutAdapter.detectPage(unsupportedDoc as unknown as Document);
    assert.strictEqual(unsupportedResult.supported, false);
    assert.strictEqual(unsupportedResult.reason, 'missing_marker');

    const nullResult = demoCheckoutAdapter.detectPage(null);
    assert.strictEqual(nullResult.supported, false);
    assert.strictEqual(nullResult.reason, 'missing_document');
  });

  await t.test('DemoCheckoutAdapter observes page state honestly', () => {
    const doc = createSupportedDocument();
    const obs = demoCheckoutAdapter.observePageState(doc as unknown as Document);
    assert.strictEqual(obs.supported, true);
    assert.strictEqual(obs.siteId, 'demo');
    assert.strictEqual(obs.pageState, 'CONTROLLED_DEMO');

    const unsupportedDoc = new MockDocument();
    const unverifiedObs = demoCheckoutAdapter.observePageState(unsupportedDoc as unknown as Document);
    assert.strictEqual(unverifiedObs.supported, false);
    assert.strictEqual(unverifiedObs.siteId, 'unsupported');
    assert.strictEqual(unverifiedObs.unverifiedReason, 'missing_marker');
  });

  await t.test('DemoCheckoutAdapter lookupTarget delegates with verified/missing status', () => {
    const doc = createSupportedDocument();
    const res = demoCheckoutAdapter.lookupTarget('checkout-total', doc as unknown as Document);
    assert.strictEqual(res.status, 'verified');

    const missingRes = demoCheckoutAdapter.lookupTarget('confirm-review', doc as unknown as Document);
    assert.strictEqual(missingRes.status, 'missing');
  });

  await t.test('Registry resolves DemoCheckoutAdapter on supported demo document', () => {
    const doc = createSupportedDocument();
    const adapter = resolveAdapter(doc as unknown as Document);
    assert.ok(adapter);
    assert.strictEqual(adapter?.siteId, 'demo');
  });

  await t.test('Registry returns null on unsupported document or null', () => {
    const unsupportedDoc = new MockDocument();
    assert.strictEqual(resolveAdapter(unsupportedDoc as unknown as Document), null);
    assert.strictEqual(resolveAdapter(null), null);
    assert.strictEqual(resolveAdapter(undefined), null);
  });

  await t.test('Registry supports dynamic adapter registration, unregistration, and reset', () => {
    assert.strictEqual(getRegisteredAdapters().length, 2);
    assert.ok(getRegisteredAdapters().some((a) => a.siteId === 'demo'));
    assert.ok(getRegisteredAdapters().some((a) => a.siteId === 'amazon_in'));

    const dummyAdapter: SiteAdapter = {
      siteId: 'unsupported' as const,
      name: 'Custom Mock Store Adapter',
      detectPage: () => ({ supported: false }),
      observePageState: () => ({ supported: false, siteId: 'unsupported' }),
      lookupTarget: () => ({ status: 'unsupported_page', targetId: 'checkout-root' }),
      dispose: () => {},
    };

    registerAdapter(dummyAdapter);
    const adaptersAfterAdd = getRegisteredAdapters();
    assert.strictEqual(adaptersAfterAdd.length, 3);
    assert.ok(adaptersAfterAdd.some((a) => a.name === 'Custom Mock Store Adapter'));

    unregisterAdapter('unsupported');
    const adaptersAfterRemove = getRegisteredAdapters();
    assert.strictEqual(adaptersAfterRemove.length, 2);

    // Reset restores both default adapters
    registerAdapter(dummyAdapter);
    resetAdapterRegistry();
    assert.strictEqual(getRegisteredAdapters().length, 2);
    assert.ok(getRegisteredAdapters().some((a) => a.siteId === 'demo'));
    assert.ok(getRegisteredAdapters().some((a) => a.siteId === 'amazon_in'));
  });

  await t.test('Lifecycle: mountAssistant resolves DemoCheckoutAdapter and instantiates mock payment', () => {
    const doc = createSupportedDocument();
    const mounted = mountAssistant(doc as unknown as Document, {
      render: () => ({ unmount: () => {} }),
    });

    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);
    assert.strictEqual(getActiveAdapter()?.siteId, 'demo');
    // On demo adapter, mock payment coordinator is instantiated
    assert.ok(getActiveCoordinator() instanceof PaymentCoordinator);

    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(getActiveAdapter(), null);
    assert.strictEqual(getActiveCoordinator(), null);
  });

  await t.test('Lifecycle: non-mock adapter does NOT instantiate PaymentCoordinator', () => {
    let disposeCalled = false;
    // Create an adapter that does NOT implement createPaymentCoordinator
    const mocklessAdapter: SiteAdapter = {
      siteId: 'amazon_in',
      name: 'Mockless Future Adapter',
      detectPage: () => ({ supported: true, siteId: 'amazon_in' }),
      observePageState: () => ({ supported: true, siteId: 'amazon_in', pageState: 'REVIEW' }),
      lookupTarget: () => ({ status: 'missing', targetId: 'checkout-root' }),
      dispose: () => {
        disposeCalled = true;
      },
      // Note: createPaymentCoordinator is intentionally omitted
    };

    const doc = new MockDocument();
    const mounted = mountAssistant(doc as unknown as Document, {
      adapter: mocklessAdapter,
      render: () => ({ unmount: () => {} }),
    });

    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);
    assert.strictEqual(getActiveAdapter()?.siteId, 'amazon_in');
    // Critical safety boundary: coordinator must be null for non-mock adapter
    assert.strictEqual(getActiveCoordinator(), null);
    assert.ok(getActiveController());

    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(disposeCalled, true);
    assert.strictEqual(getActiveAdapter(), null);
  });

  await t.test('Lifecycle: Rejects mount when registry returns null for unsupported page', () => {
    const unsupportedDoc = new MockDocument();
    const mounted = mountAssistant(unsupportedDoc as unknown as Document, {
      render: () => ({ unmount: () => {} }),
    });

    assert.strictEqual(mounted, false);
    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(getActiveAdapter(), null);
  });
});
