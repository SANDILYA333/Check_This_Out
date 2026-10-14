import test from 'node:test';
import assert from 'node:assert';
import { TargetHighlighter } from '../../src/content/assistant/highlighter.ts';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';

function createValidDemoDoc(): MockDocument {
  const doc = new MockDocument();
  doc.body.setAttribute('data-voicecheckout-demo', 'true');

  const total = new MockHTMLElement({
    attributes: { 'data-testid': 'checkout-total' },
  });
  doc.body.appendChild(total);

  return doc;
}

test('Target Highlighter — Verification, Styling, and Restoration', async (t) => {
  await t.test('Applies high-contrast highlight to a verified target', () => {
    const doc = createValidDemoDoc();
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    doc.body.appendChild(btn);

    const highlighter = new TargetHighlighter();
    const res = highlighter.update('confirm-address', doc as unknown as Document);

    assert.ok(res && res.status === 'verified');
    assert.strictEqual(highlighter.getHighlightedElement(), btn as unknown as HTMLElement);
    assert.strictEqual(btn.hasAttribute('data-voicecheckout-highlight'), true);
    assert.ok(btn.style.getPropertyValue('outline').includes('3px solid'));
    assert.strictEqual(btn.style.getPropertyPriority('outline'), 'important');
    assert.ok(btn.style.getPropertyValue('box-shadow').length > 0);
  });

  await t.test('Captures and accurately restores original host styles upon clear()', () => {
    const doc = createValidDemoDoc();
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    // Host page has custom outline and boxShadow
    btn.style.setProperty('outline', '1px dashed red', '');
    btn.style.setProperty('box-shadow', 'none', '');

    doc.body.appendChild(btn);

    const highlighter = new TargetHighlighter();
    highlighter.update('confirm-address', doc as unknown as Document);

    // Verify temporary styles were applied
    assert.ok(btn.style.getPropertyValue('outline').includes('3px solid'));

    // Clear highlight
    highlighter.clear();

    // Verify exact original styles were restored
    assert.strictEqual(btn.style.getPropertyValue('outline'), '1px dashed red');
    assert.strictEqual(btn.style.getPropertyPriority('outline'), '');
    assert.strictEqual(btn.style.getPropertyValue('box-shadow'), 'none');
    assert.strictEqual(btn.hasAttribute('data-voicecheckout-highlight'), false);
    assert.strictEqual(highlighter.getHighlightedElement(), null);
  });

  await t.test('Removes highlight when target changes to null or missing target', () => {
    const doc = createValidDemoDoc();
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
    });
    doc.body.appendChild(btn);

    const highlighter = new TargetHighlighter();
    highlighter.update('confirm-address', doc as unknown as Document);
    assert.strictEqual(highlighter.getHighlightedElement(), btn as unknown as HTMLElement);

    // Update with null target
    highlighter.update(null, doc as unknown as Document);
    assert.strictEqual(highlighter.getHighlightedElement(), null);
    assert.strictEqual(btn.hasAttribute('data-voicecheckout-highlight'), false);

    // Update with missing target
    highlighter.update('confirm-review', doc as unknown as Document);
    assert.strictEqual(highlighter.getHighlightedElement(), null);
  });

  await t.test('Highlighting does not trigger click or mutate host attributes', () => {
    const doc = createValidDemoDoc();
    const btn = new MockHTMLElement({
      tagName: 'button',
      attributes: { 'data-testid': 'confirm-address' },
      disabled: false,
    });
    doc.body.appendChild(btn);

    const highlighter = new TargetHighlighter();
    highlighter.update('confirm-address', doc as unknown as Document);

    assert.strictEqual(btn.clickedCount, 0);
    assert.strictEqual(btn.disabled, false);

    highlighter.clear();
    assert.strictEqual(btn.clickedCount, 0);
  });

  await t.test('Clear is idempotent and safe when called repeatedly', () => {
    const highlighter = new TargetHighlighter();
    assert.doesNotThrow(() => {
      highlighter.clear();
      highlighter.clear();
      highlighter.destroy();
    });
  });
});
