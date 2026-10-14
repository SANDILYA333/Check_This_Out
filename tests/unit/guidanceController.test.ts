import test from 'node:test';
import assert from 'node:assert';
import { GuidanceController } from '../../src/content/assistant/guidanceController.ts';
import type { CheckoutState } from '../../src/guidance/types.ts';

test('Guidance Controller — Reactive State Management', async (t) => {
  await t.test('Initializes with default WELCOME state', () => {
    const controller = new GuidanceController('en');
    const state = controller.getState();
    assert.strictEqual(state.stage, 'WELCOME');
    assert.strictEqual(state.language, 'en');
    assert.strictEqual(state.transactionId, null);
    assert.strictEqual(state.paymentStatus, 'none');
    assert.strictEqual(controller.getLastError(), null);
  });

  await t.test('Notifies subscribers upon valid transition', () => {
    const controller = new GuidanceController('en');
    const observed: CheckoutState[] = [];

    const unsubscribe = controller.subscribe((s) => {
      observed.push(s);
    });

    const res = controller.dispatch({ type: 'START_ASSISTANCE' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(observed.length, 1);
    assert.strictEqual(observed[0].stage, 'LANGUAGE');

    unsubscribe();

    // After unsubscribe, no further notifications
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'te' });
    assert.strictEqual(observed.length, 1);
    assert.strictEqual(controller.getState().stage, 'ADDRESS');
  });

  await t.test('Stores error and does not mutate state on rejected transition', () => {
    const controller = new GuidanceController('en');
    const initialState = controller.getState();

    // Confirming address from WELCOME is invalid
    const res = controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(controller.getState(), initialState);
    assert.ok(controller.getLastError() !== null);
  });

  await t.test('Language switching preserves active checkout progress and transaction state', () => {
    const controller = new GuidanceController('en');
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    controller.dispatch({ type: 'CONFIRM_REVIEW', transactionId: 'vc_txn_sample_999' });

    const beforeSwitch = controller.getState();
    assert.strictEqual(beforeSwitch.stage, 'UPI_SIMULATION');
    assert.strictEqual(beforeSwitch.transactionId, 'vc_txn_sample_999');

    // Switch to Telugu
    const res = controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'te' });
    assert.strictEqual(res.ok, true);

    const afterSwitch = controller.getState();
    assert.strictEqual(afterSwitch.stage, 'UPI_SIMULATION');
    assert.strictEqual(afterSwitch.transactionId, 'vc_txn_sample_999');
    assert.strictEqual(afterSwitch.paymentStatus, 'unresolved');
    assert.strictEqual(afterSwitch.language, 'te');
  });

  await t.test('destroy() clears listeners and state errors', () => {
    const controller = new GuidanceController('en');
    let called = false;
    controller.subscribe(() => {
      called = true;
    });

    controller.destroy();
    controller.dispatch({ type: 'START_ASSISTANCE' });
    assert.strictEqual(called, false);
    assert.strictEqual(controller.getLastError(), null);
  });
});
