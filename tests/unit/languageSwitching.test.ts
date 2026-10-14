import test from 'node:test';
import assert from 'node:assert';
import { GuidanceController } from '../../src/content/assistant/guidanceController.ts';
import {
  getMessage,
  getStageMessageMapping,
  type Language,
} from '../../src/localization/index.ts';
import { resolveAudioUrl } from '../../src/audio/audioAssetResolver.ts';
import type { CheckoutStage } from '../../src/guidance/types.ts';

test('Language Switching — State Preservation and Multilingual Synchronization', async (t) => {
  await t.test('Language switch preserves stage and updates visible & audio mappings at ADDRESS', () => {
    const controller = new GuidanceController('en');
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    assert.strictEqual(controller.getState().stage, 'ADDRESS');

    // Switch to Telugu
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'te' });
    const teState = controller.getState();
    assert.strictEqual(teState.stage, 'ADDRESS');
    assert.strictEqual(teState.language, 'te');
    assert.strictEqual(teState.targetId, 'confirm-address');

    // Check visible copy
    const mapping = getStageMessageMapping(teState.stage);
    const teInstruction = getMessage('te', mapping.instructionKey);
    assert.ok(teInstruction.includes('డెలివరీ చిరునామాను సరిచూసుకోండి'));

    // Check resolved audio URL
    const teAudioUrl = resolveAudioUrl('te', mapping.instructionKey);
    assert.strictEqual(teAudioUrl, '/audio/te/address_instruction.mp3');

    // Switch to Hindi
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'hi' });
    const hiState = controller.getState();
    assert.strictEqual(hiState.stage, 'ADDRESS');
    assert.strictEqual(hiState.language, 'hi');
    const hiInstruction = getMessage('hi', mapping.instructionKey);
    assert.ok(hiInstruction.includes('डिलीवरी पता जांचें'));

    const hiAudioUrl = resolveAudioUrl('hi', mapping.instructionKey);
    assert.strictEqual(hiAudioUrl, '/audio/hi/address_instruction.mp3');
  });

  await t.test('Language switch at UPI_SIMULATION preserves transaction ID and keeps PIN safety warning', () => {
    const controller = new GuidanceController('en');
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    controller.dispatch({ type: 'CONFIRM_REVIEW' });

    const state = controller.getState();
    assert.strictEqual(state.stage, 'UPI_SIMULATION');
    const txnId = state.transactionId;
    assert.ok(txnId && txnId.startsWith('vc_txn_'));

    // Switch to Telugu
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'te' });
    const teState = controller.getState();
    assert.strictEqual(teState.stage, 'UPI_SIMULATION');
    assert.strictEqual(teState.transactionId, txnId); // Transaction ID preserved!
    assert.strictEqual(teState.language, 'te');

    // PIN warning in Telugu
    const tePinWarning = getMessage('te', 'upi_safety_warning');
    assert.strictEqual(tePinWarning, 'మీ పిన్ ఎవరికీ చెప్పవద్దు.');
    assert.strictEqual(
      resolveAudioUrl('te', 'upi_safety_warning'),
      '/audio/te/upi_safety_warning.mp3'
    );

    // Switch to Hindi
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'hi' });
    const hiState = controller.getState();
    assert.strictEqual(hiState.stage, 'UPI_SIMULATION');
    assert.strictEqual(hiState.transactionId, txnId); // Transaction ID preserved!
    assert.strictEqual(hiState.language, 'hi');

    // PIN warning in Hindi
    const hiPinWarning = getMessage('hi', 'upi_safety_warning');
    assert.strictEqual(hiPinWarning, 'अपना पिन कभी किसी को न बताएं।');
    assert.strictEqual(
      resolveAudioUrl('hi', 'upi_safety_warning'),
      '/audio/hi/upi_safety_warning.mp3'
    );
  });

  await t.test('Language switch at terminal and in-flight stages preserves paymentStatus', () => {
    const controller = new GuidanceController('en');
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    controller.dispatch({ type: 'CONFIRM_REVIEW' });
    controller.dispatch({ type: 'CONFIRM_UPI_HANDOFF' });

    assert.strictEqual(controller.getState().stage, 'PROCESSING');
    assert.strictEqual(controller.getState().paymentStatus, 'unresolved');

    // Switch language in PROCESSING
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'te' });
    assert.strictEqual(controller.getState().stage, 'PROCESSING');
    assert.strictEqual(controller.getState().paymentStatus, 'unresolved');

    // Resolve payment to SUCCESS
    controller.dispatch({ type: 'PAYMENT_SUCCESS' });
    assert.strictEqual(controller.getState().stage, 'SUCCESS');
    assert.strictEqual(controller.getState().paymentStatus, 'success');

    // Switch language in SUCCESS
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'hi' });
    assert.strictEqual(controller.getState().stage, 'SUCCESS');
    assert.strictEqual(controller.getState().paymentStatus, 'success');
  });

  await t.test('Fixed amount ₹1,499 remains constant across language switches', () => {
    const langs: Language[] = ['en', 'te', 'hi'];
    for (const lang of langs) {
      assert.strictEqual(getMessage(lang, 'order_total_value'), '₹1,499');
    }
  });
});
