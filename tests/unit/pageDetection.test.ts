import test from 'node:test';
import assert from 'node:assert';
import { isControlledCheckoutPage } from '../../src/content/adapters/demoCheckoutAdapter.ts';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';

test('Page Detection — Controlled Checkout Verification', async (t) => {
  await t.test('Identifies valid controlled demo checkout page', () => {
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

    const result = isControlledCheckoutPage(doc as unknown as Document);
    assert.strictEqual(result.supported, true);
    assert.strictEqual(result.reason, undefined);
  });

  await t.test('Handles missing document or body safely', () => {
    assert.strictEqual(isControlledCheckoutPage(null).supported, false);
    assert.strictEqual(isControlledCheckoutPage(null).reason, 'missing_document');
    assert.strictEqual(
      isControlledCheckoutPage({} as unknown as Document).supported,
      false
    );
  });

  await t.test('Rejects page missing the project-owned marker attribute', () => {
    const doc = new MockDocument();
    // No data-voicecheckout-demo attribute
    const productCard = new MockHTMLElement({
      attributes: { 'data-testid': 'product-card' },
    });
    doc.body.appendChild(productCard);

    const result = isControlledCheckoutPage(doc as unknown as Document);
    assert.strictEqual(result.supported, false);
    assert.strictEqual(result.reason, 'missing_marker');
  });

  await t.test('Rejects page with marker but malformed root structure', () => {
    const doc = new MockDocument();
    doc.body.setAttribute('data-voicecheckout-demo', 'true');
    // Neither product-card nor checkout-total present

    const result = isControlledCheckoutPage(doc as unknown as Document);
    assert.strictEqual(result.supported, false);
    assert.strictEqual(result.reason, 'malformed_root');
  });

  await t.test('Detection is strictly read-only and does not mutate page DOM', () => {
    const doc = new MockDocument();
    doc.body.setAttribute('data-voicecheckout-demo', 'true');
    const total = new MockHTMLElement({
      attributes: { 'data-testid': 'checkout-total' },
    });
    doc.body.appendChild(total);

    const initialAttrCount = doc.body.attributes.size;
    const initialChildrenCount = doc.body.children.length;

    const result = isControlledCheckoutPage(doc as unknown as Document);
    assert.strictEqual(result.supported, true);

    // Verify DOM was not mutated
    assert.strictEqual(doc.body.attributes.size, initialAttrCount);
    assert.strictEqual(doc.body.children.length, initialChildrenCount);
  });
});
