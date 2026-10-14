import test from 'node:test';
import assert from 'node:assert';
import { ActionObserver } from '../../src/content/assistant/actionObserver.ts';
import { GuidanceController } from '../../src/content/assistant/guidanceController.ts';
import { TargetHighlighter } from '../../src/content/assistant/highlighter.ts';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';

function setupEnvironment() {
  const doc = new MockDocument();
  doc.body.setAttribute('data-voicecheckout-demo', 'true');

  const total = new MockHTMLElement({
    attributes: { 'data-testid': 'checkout-total' },
  });
  doc.body.appendChild(total);

  const confirmAddressBtn = new MockHTMLElement({
    tagName: 'button',
    attributes: { 'data-testid': 'confirm-address' },
  });
  const continueReviewBtn = new MockHTMLElement({
    tagName: 'button',
    attributes: { 'data-testid': 'continue-to-review' },
  });
  const confirmReviewBtn = new MockHTMLElement({
    tagName: 'button',
    attributes: { 'data-testid': 'confirm-review' },
  });
  const confirmUpiBtn = new MockHTMLElement({
    tagName: 'button',
    attributes: { 'data-testid': 'confirm-upi-handoff' },
  });

  doc.body.appendChild(confirmAddressBtn);
  doc.body.appendChild(continueReviewBtn);
  doc.body.appendChild(confirmReviewBtn);
  doc.body.appendChild(confirmUpiBtn);

  const controller = new GuidanceController('en');
  const highlighter = new TargetHighlighter();
  const observer = new ActionObserver({
    controller,
    highlighter,
    doc: doc as unknown as Document,
  });

  return {
    doc,
    controller,
    highlighter,
    observer,
    confirmAddressBtn,
    continueReviewBtn,
    confirmReviewBtn,
    confirmUpiBtn,
  };
}

test('Action Observer — User Interaction and State Coordination', async (t) => {
  await t.test('User click on verified target advances guidance state', () => {
    const { controller, confirmAddressBtn, doc } = setupEnvironment();

    // Advance to ADDRESS
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    assert.strictEqual(controller.getState().stage, 'ADDRESS');

    // Simulate user clicking confirm-address on the host page
    doc.dispatchEvent({
      type: 'click',
      target: confirmAddressBtn,
    });

    // Observer should have coordinated transition to METHOD
    assert.strictEqual(controller.getState().stage, 'METHOD');
  });

  await t.test('Click on unrelated element does not advance checkout stage', () => {
    const { controller, doc } = setupEnvironment();

    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    assert.strictEqual(controller.getState().stage, 'ADDRESS');

    const unrelatedEl = new MockHTMLElement({ tagName: 'DIV' });
    doc.body.appendChild(unrelatedEl);

    doc.dispatchEvent({
      type: 'click',
      target: unrelatedEl,
    });

    // Stage must remain unchanged
    assert.strictEqual(controller.getState().stage, 'ADDRESS');
  });

  await t.test('Full user flow progression coordinated across multiple stages', () => {
    const {
      controller,
      doc,
      confirmAddressBtn,
      continueReviewBtn,
      confirmReviewBtn,
      confirmUpiBtn,
    } = setupEnvironment();

    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    assert.strictEqual(controller.getState().stage, 'ADDRESS');

    // Step 1: User clicks confirm address
    doc.dispatchEvent({ type: 'click', target: confirmAddressBtn });
    assert.strictEqual(controller.getState().stage, 'METHOD');

    // Step 2: User clicks continue to review
    doc.dispatchEvent({ type: 'click', target: continueReviewBtn });
    assert.strictEqual(controller.getState().stage, 'REVIEW');

    // Step 3: User clicks confirm review
    doc.dispatchEvent({ type: 'click', target: confirmReviewBtn });
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');
    assert.ok(controller.getState().transactionId !== null);

    // Step 4: User clicks confirm UPI simulation
    doc.dispatchEvent({ type: 'click', target: confirmUpiBtn });
    assert.strictEqual(controller.getState().stage, 'PROCESSING');
  });

  await t.test('Disconnected observer stops responding to user interactions', () => {
    const { controller, confirmAddressBtn, doc, observer } = setupEnvironment();

    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    assert.strictEqual(controller.getState().stage, 'ADDRESS');

    observer.disconnect();

    // Click after disconnect
    doc.dispatchEvent({
      type: 'click',
      target: confirmAddressBtn,
    });

    // Stage must remain unchanged
    assert.strictEqual(controller.getState().stage, 'ADDRESS');
  });
});
