import test from 'node:test';
import assert from 'node:assert';
import { lookupTarget } from '../../src/content/targets/targetRegistry.ts';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';

function createValidDemoDoc(): { doc: MockDocument; root: MockHTMLElement } {
  const doc = new MockDocument();
  doc.body.setAttribute('data-voicecheckout-demo', 'true');

  const productCard = new MockHTMLElement({
    attributes: { 'data-testid': 'product-card' },
  });
  const total = new MockHTMLElement({
    attributes: { 'data-testid': 'checkout-total' },
  });
  doc.body.appendChild(productCard);
  doc.body.appendChild(total);

  return { doc, root: doc.body };
}

test('Target Registry — Verified Target Lookup', async (t) => {
  await t.test('Verifies a single valid, visible, and enabled target', () => {
    const { doc } = createValidDemoDoc();
    const confirmBtn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
      isConnected: true,
      disabled: false,
    });
    doc.body.appendChild(confirmBtn);

    const res = lookupTarget('confirm-address', doc as unknown as Document);
    assert.strictEqual(res.status, 'verified');
    if (res.status === 'verified') {
      assert.strictEqual(res.targetId, 'confirm-address');
      assert.strictEqual(res.element, confirmBtn as unknown as HTMLElement);
    }
  });

  await t.test('Returns "missing" when target element does not exist', () => {
    const { doc } = createValidDemoDoc();
    const res = lookupTarget('payment-method', doc as unknown as Document);
    assert.strictEqual(res.status, 'missing');
    assert.strictEqual(res.targetId, 'payment-method');
  });

  await t.test('Returns "ambiguous" when multiple matching elements exist', () => {
    const { doc } = createValidDemoDoc();
    const btn1 = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    const btn2 = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    doc.body.appendChild(btn1);
    doc.body.appendChild(btn2);

    const res = lookupTarget('confirm-address', doc as unknown as Document);
    assert.strictEqual(res.status, 'ambiguous');
    if (res.status === 'ambiguous') {
      assert.strictEqual(res.count, 2);
    }
  });

  await t.test('Returns "hidden" when target has display: none or visibility: hidden', () => {
    const { doc } = createValidDemoDoc();
    const hiddenBtn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-review' },
      style: { display: 'none' },
    });
    doc.body.appendChild(hiddenBtn);

    const res = lookupTarget('confirm-review', doc as unknown as Document);
    assert.strictEqual(res.status, 'hidden');

    // Also test visibility: hidden
    hiddenBtn.style = { visibility: 'hidden' };
    const res2 = lookupTarget('confirm-review', doc as unknown as Document);
    assert.strictEqual(res2.status, 'hidden');

    // Also test hidden attribute
    hiddenBtn.style = {};
    hiddenBtn.setAttribute('hidden', '');
    const res3 = lookupTarget('confirm-review', doc as unknown as Document);
    assert.strictEqual(res3.status, 'hidden');
  });

  await t.test('Returns "disabled" when action target is disabled', () => {
    const { doc } = createValidDemoDoc();
    const disabledBtn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'continue-to-review' },
      disabled: true,
    });
    doc.body.appendChild(disabledBtn);

    const res = lookupTarget('continue-to-review', doc as unknown as Document);
    assert.strictEqual(res.status, 'disabled');

    // Also test aria-disabled="true"
    disabledBtn.disabled = false;
    disabledBtn.setAttribute('aria-disabled', 'true');
    const res2 = lookupTarget('continue-to-review', doc as unknown as Document);
    assert.strictEqual(res2.status, 'disabled');
  });

  await t.test('Returns "missing" when target element is detached (isConnected: false)', () => {
    const { doc } = createValidDemoDoc();
    const detachedBtn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-upi-handoff' },
      isConnected: false,
    });
    doc.body.appendChild(detachedBtn);

    const res = lookupTarget('confirm-upi-handoff', doc as unknown as Document);
    assert.strictEqual(res.status, 'missing');
  });

  await t.test('Returns "unsupported_page" on an unsupported document', () => {
    const unsuppDoc = new MockDocument(); // No marker
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    unsuppDoc.body.appendChild(btn);

    const res = lookupTarget('confirm-address', unsuppDoc as unknown as Document);
    assert.strictEqual(res.status, 'unsupported_page');
  });

  await t.test('SAFETY INVARIANT: Lookup is read-only and never clicks or mutates the target', () => {
    const { doc } = createValidDemoDoc();
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
      disabled: false,
    });
    doc.body.appendChild(btn);

    const res = lookupTarget('confirm-address', doc as unknown as Document);
    assert.strictEqual(res.status, 'verified');

    // Verify button was never clicked or mutated
    assert.strictEqual(btn.clickedCount, 0);
    assert.strictEqual(btn.disabled, false);
  });
});
