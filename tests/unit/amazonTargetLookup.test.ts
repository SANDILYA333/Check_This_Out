import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import { amazonCheckoutAdapter } from '../../src/content/adapters/amazonCheckoutAdapter.ts';
import { TargetHighlighter } from '../../src/content/assistant/highlighter.ts';

/**
 * Creates a synthetic MockDocument representing an Amazon India page.
 * NOTE: All fixtures in this suite are synthetic models constructed from
 * technical discovery and public specifications; they are not live captured pages.
 */
function createSyntheticAmazonDocument(
  url: string,
  elementInits: Array<{ tagName?: string; id?: string; attributes?: Record<string, string>; disabled?: boolean; isConnected?: boolean; style?: Record<string, string> }> = []
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

test('Amazon India Target Lookup — Verification and Status Classification', async (t) => {
  await t.test('Verifies unique, visible, enabled "Proceed to Buy" button on CART page', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout', type: 'submit', value: 'Proceed to Buy' } }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'verified');
    if (result.status === 'verified') {
      assert.strictEqual(result.targetId, 'amazon-proceed-to-buy');
      assert.strictEqual(result.element.tagName, 'INPUT');
      assert.strictEqual(result.element.getAttribute('name'), 'proceedToRetailCheckout');
    }
  });

  await t.test('Verifies unique address confirmation button on ADDRESS_SELECTION page', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/addressselect/handlers/display.html',
      [{ tagName: 'input', attributes: { 'data-testid': 'Address_selectShipToThisAddress', type: 'submit', value: 'Use this address' } }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-select-address', doc as unknown as Document);
    assert.strictEqual(result.status, 'verified');
    if (result.status === 'verified') {
      assert.strictEqual(result.element.getAttribute('data-testid'), 'Address_selectShipToThisAddress');
    }

    // Also supports mapped canonical alias confirm-address
    const aliasResult = amazonCheckoutAdapter.lookupTarget('confirm-address', doc as unknown as Document);
    assert.strictEqual(aliasResult.status, 'verified');
  });

  await t.test('Verifies unique payment continue button on PAYMENT_SELECTION page', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/payselect/handlers/display.html',
      [{ tagName: 'input', attributes: { name: 'ppw-widgetEvent:SetPaymentPlanSelectContinueEvent', type: 'submit' } }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-select-payment', doc as unknown as Document);
    assert.strictEqual(result.status, 'verified');

    // Also supports mapped canonical alias continue-to-review
    const aliasResult = amazonCheckoutAdapter.lookupTarget('continue-to-review', doc as unknown as Document);
    assert.strictEqual(aliasResult.status, 'verified');
  });

  await t.test('Verifies unique place-order button on ORDER_REVIEW page', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/spc/handlers/display.html',
      [{ tagName: 'input', attributes: { name: 'placeYourOrder1', type: 'submit' } }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-place-order', doc as unknown as Document);
    assert.strictEqual(result.status, 'verified');

    // Also supports mapped canonical alias confirm-review
    const aliasResult = amazonCheckoutAdapter.lookupTarget('confirm-review', doc as unknown as Document);
    assert.strictEqual(aliasResult.status, 'verified');
  });

  await t.test('Returns "missing" when target element does not exist on page', () => {
    // Cart page without proceed button
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'div', id: 'activeCartViewForm' }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'missing');
    assert.strictEqual(result.targetId, 'amazon-proceed-to-buy');
  });

  await t.test('AMBIGUITY CHECK: Returns "ambiguous" when multiple matching target controls exist', () => {
    // Both top and bottom proceed buttons exist
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [
        { tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } },
        { tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } },
      ]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'ambiguous');
    if (result.status === 'ambiguous') {
      assert.strictEqual(result.count, 2);
    }
  });

  await t.test('Returns "hidden" when target control is not visible (display: none)', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{
        tagName: 'input',
        attributes: { name: 'proceedToRetailCheckout' },
        style: { display: 'none' },
      }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'hidden');
  });

  await t.test('Returns "disabled" when target control is disabled or aria-disabled', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{
        tagName: 'input',
        attributes: { name: 'proceedToRetailCheckout', 'aria-disabled': 'true' },
      }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'disabled');
  });

  await t.test('Returns "missing" when target control is detached from active document', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html');
    const detachedBtn = new MockHTMLElement({
      tagName: 'input',
      attributes: { name: 'proceedToRetailCheckout' },
      isConnected: false,
    });
    // Add directly to body child list but force isConnected = false
    doc.body.children.push(detachedBtn);

    const result = amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result.status, 'missing');
  });

  await t.test('STATE MISMATCH: Returns "unsupported_page" if target does not belong to current stage', () => {
    // On CART page, querying place-order target
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );

    const result = amazonCheckoutAdapter.lookupTarget('amazon-place-order', doc as unknown as Document);
    assert.strictEqual(result.status, 'unsupported_page');
  });

  await t.test('AUTH & CHALLENGE: Returns "unsupported_page" on sign-in or security challenge', () => {
    const authDoc = createSyntheticAmazonDocument(
      'https://www.amazon.in/ap/signin',
      [{ tagName: 'form', attributes: { name: 'signIn' } }]
    );
    assert.strictEqual(
      amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', authDoc as unknown as Document).status,
      'unsupported_page'
    );

    const captchaDoc = createSyntheticAmazonDocument(
      'https://www.amazon.in/errors/validateCaptcha',
      [{ tagName: 'form', attributes: { action: '/errors/validateCaptcha' } }]
    );
    assert.strictEqual(
      amazonCheckoutAdapter.lookupTarget('amazon-proceed-to-buy', captchaDoc as unknown as Document).status,
      'unsupported_page'
    );
  });

  await t.test('SENSITIVE FIELD REJECTION: Password, OTP, CVV, or card inputs are NEVER returned as targets', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/buy/payselect/handlers/display.html',
      [
        { tagName: 'input', attributes: { name: 'ppw-widgetEvent:SetPaymentPlanSelectContinueEvent' } },
        { tagName: 'input', attributes: { name: 'addCreditCardVerificationNumber', type: 'password' } },
      ]
    );

    // Any lookup targeting a sensitive input must fail
    const targetWithPassword = new MockHTMLElement({
      tagName: 'input',
      attributes: { name: 'ppw-widgetEvent:SetPaymentPlanSelectContinueEvent', type: 'password' },
    });
    const sensitiveDoc = createSyntheticAmazonDocument('https://www.amazon.in/gp/buy/payselect/handlers/display.html');
    sensitiveDoc.body.appendChild(targetWithPassword);

    const result = amazonCheckoutAdapter.lookupTarget('amazon-select-payment', sensitiveDoc as unknown as Document);
    assert.strictEqual(result.status, 'unsupported_page');
  });
});

test('Amazon India Target Highlighter — Integration and Lifecycle', async (t) => {
  await t.test('Applies high-contrast highlight to verified Amazon target', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );
    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);

    const result = highlighter.update('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(result?.status, 'verified');

    const highlighted = highlighter.getHighlightedElement();
    assert.ok(highlighted);
    assert.strictEqual(highlighted?.getAttribute('data-voicecheckout-highlight'), 'true');
    assert.strictEqual(highlighted?.style.getPropertyValue('outline'), '3px solid #3182ce');

    highlighter.clear();
    assert.strictEqual(highlighter.getHighlightedElement(), null);
    assert.strictEqual(highlighted?.getAttribute('data-voicecheckout-highlight'), null);
  });

  await t.test('Clears highlight when target becomes ambiguous or missing', () => {
    const doc = createSyntheticAmazonDocument(
      'https://www.amazon.in/gp/cart/view.html',
      [{ tagName: 'input', attributes: { name: 'proceedToRetailCheckout' } }]
    );
    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);

    // Initial highlight
    highlighter.update('amazon-proceed-to-buy', doc as unknown as Document);
    assert.ok(highlighter.getHighlightedElement());

    // Update with non-matching target (e.g. place-order)
    highlighter.update('amazon-place-order', doc as unknown as Document);
    assert.strictEqual(highlighter.getHighlightedElement(), null);
  });

  await t.test('Accurately restores host styles after highlight removal', () => {
    const doc = createSyntheticAmazonDocument('https://www.amazon.in/gp/cart/view.html');
    const btn = new MockHTMLElement({
      tagName: 'input',
      attributes: { name: 'proceedToRetailCheckout' },
    });
    btn.style.setProperty('outline', '1px dashed red');
    btn.style.setProperty('box-shadow', 'none');
    doc.body.appendChild(btn);

    const highlighter = new TargetHighlighter(amazonCheckoutAdapter);

    // Highlight
    highlighter.update('amazon-proceed-to-buy', doc as unknown as Document);
    assert.strictEqual(btn.style.getPropertyValue('outline'), '3px solid #3182ce');

    // Clear
    highlighter.clear();
    assert.strictEqual(btn.style.getPropertyValue('outline'), '1px dashed red');
    assert.strictEqual(btn.style.getPropertyValue('box-shadow'), 'none');
  });
});
