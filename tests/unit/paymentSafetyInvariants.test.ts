import test from 'node:test';
import assert from 'node:assert';
import { GuidanceController } from '../../src/content/assistant/guidanceController.ts';
import { DeterministicMockPaymentService } from '../../src/payments/mockPaymentService.ts';
import { PaymentCoordinator } from '../../src/payments/paymentCoordinator.ts';
import type { Language } from '../../src/guidance/types.ts';

function createCheckoutTestHarness(scenario: Parameters<DeterministicMockPaymentService['setScenario']>[0] = 'immediate_success') {
  const controller = new GuidanceController('en');
  const service = new DeterministicMockPaymentService(scenario);
  const coordinator = new PaymentCoordinator({ controller, service });

  const reachReview = () => {
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    assert.strictEqual(controller.getState().stage, 'REVIEW');
  };

  return { controller, service, coordinator, reachReview };
}

test('Payment Safety Invariants — Non-Negotiable Safety Rules and Boundary Guarantees', async (t) => {
  await t.test('RULE 4.1 & 4.2: Zero credential collection and local-only simulation', async () => {
    const service = new DeterministicMockPaymentService();
    const order = await service.createOrder();

    // Verify transaction structure only contains transactionId and no credential fields
    const keys = Object.keys(order);
    assert.deepStrictEqual(keys, ['transactionId']);
    assert.strictEqual(typeof order.transactionId, 'string');
  });

  await t.test('RULE 4.3: Order creation is NOT payment success', async () => {
    const { controller, coordinator, reachReview } = createCheckoutTestHarness();
    reachReview();

    // Calling confirmReview invokes createOrder()
    const reviewRes = await coordinator.confirmReview();
    assert.strictEqual(reviewRes.ok, true);

    const state = controller.getState();
    assert.strictEqual(state.stage, 'UPI_SIMULATION');
    assert.notStrictEqual(state.stage, 'SUCCESS', 'Order creation must never transition to SUCCESS');
    assert.notStrictEqual(state.paymentStatus, 'success', 'Order creation must never set status to success');
    assert.strictEqual(state.paymentStatus, 'unresolved', 'Order creation status must remain unresolved');
  });

  await t.test('RULE 4.3: Only explicit confirmed success from mock service can transition to SUCCESS', async () => {
    const { controller, coordinator, reachReview, service } = createCheckoutTestHarness('immediate_success');
    reachReview();
    await coordinator.confirmReview();

    // Entering PROCESSING without mock service confirmation is NOT success
    controller.dispatch({ type: 'CONFIRM_UPI_HANDOFF' });
    assert.strictEqual(controller.getState().stage, 'PROCESSING');
    assert.notStrictEqual(controller.getState().stage, 'SUCCESS');

    // Only when service returns validated success
    const status = await service.getStatus(controller.getState().transactionId!);
    assert.strictEqual(status, 'success');

    controller.dispatch({ type: 'PAYMENT_SUCCESS' });
    assert.strictEqual(controller.getState().stage, 'SUCCESS');
    assert.strictEqual(controller.getState().paymentStatus, 'success');
  });

  await t.test('RULE 4.4: Pending must remain pending; never converts to success automatically', async () => {
    const { controller, coordinator, reachReview } = createCheckoutTestHarness('remains_pending');
    reachReview();
    await coordinator.confirmReview();
    await coordinator.confirmUpiHandoff();

    assert.strictEqual(controller.getState().stage, 'PENDING');
    assert.strictEqual(controller.getState().paymentStatus, 'pending');

    // Subsequent recheck still remains pending
    const recheckRes = await coordinator.recheckPendingStatus();
    assert.strictEqual(recheckRes.status, 'pending');
    assert.strictEqual(controller.getState().stage, 'PENDING');
    assert.strictEqual(controller.getState().paymentStatus, 'pending');

    // Language switch preserves pending state
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: 'hi' });
    assert.strictEqual(controller.getState().stage, 'PENDING');
    assert.strictEqual(controller.getState().paymentStatus, 'pending');
  });

  await t.test('RULE 4.4 & 4.5: Rechecking pending reuses the EXACT same transaction ID', async () => {
    const { controller, coordinator, reachReview, service } = createCheckoutTestHarness('pending_then_success');
    reachReview();

    const reviewRes = await coordinator.confirmReview();
    const originalTxnId = reviewRes.transactionId!;

    // First check -> PENDING
    await coordinator.confirmUpiHandoff();
    assert.strictEqual(controller.getState().transactionId, originalTxnId);
    assert.strictEqual(service.getCheckCount(originalTxnId), 1);

    // Second check -> SUCCESS reusing same ID
    await coordinator.recheckPendingStatus();
    assert.strictEqual(controller.getState().transactionId, originalTxnId);
    assert.strictEqual(service.getCheckCount(originalTxnId), 2);
    assert.strictEqual(controller.getState().stage, 'SUCCESS');
  });

  await t.test('RULE 4.5: User actions remain explicit; no auto-confirmation of review or UPI handoff', async () => {
    const { controller, reachReview } = createCheckoutTestHarness();
    reachReview();

    // In REVIEW, state does not auto-advance to UPI_SIMULATION without explicit user confirm
    assert.strictEqual(controller.getState().stage, 'REVIEW');
    assert.strictEqual(controller.getState().transactionId, null);

    // In UPI_SIMULATION, state does not auto-advance to PROCESSING without explicit user confirm
    controller.dispatch({ type: 'CONFIRM_REVIEW' });
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');
  });

  await t.test('RULE 4.5 & Section 9: Retry is allowed strictly after confirmed failure and returns to METHOD', async () => {
    const { controller, coordinator, reachReview } = createCheckoutTestHarness('immediate_failure');
    reachReview();
    await coordinator.confirmReview();
    await coordinator.confirmUpiHandoff();

    assert.strictEqual(controller.getState().stage, 'FAILED');
    assert.strictEqual(controller.getState().paymentStatus, 'failed');

    // Explicit retry returns user to METHOD and clears the transaction
    const retryRes = coordinator.retry();
    assert.strictEqual(retryRes.ok, true);

    const afterRetry = controller.getState();
    assert.strictEqual(afterRetry.stage, 'METHOD');
    assert.strictEqual(afterRetry.transactionId, null, 'Must clear failed transaction on retry');
    assert.strictEqual(afterRetry.paymentStatus, 'none');

    // User must manually advance through flow to REVIEW again before a new transaction is created
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    assert.strictEqual(controller.getState().stage, 'REVIEW');
    assert.strictEqual(controller.getState().transactionId, null);

    // New transaction created only after second review confirmation
    const secondReview = await coordinator.confirmReview();
    assert.strictEqual(secondReview.ok, true);
    assert.notStrictEqual(secondReview.transactionId, null);
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');
  });

  await t.test('Language switching preserves active transaction ID across all states', async () => {
    const { controller, coordinator, reachReview } = createCheckoutTestHarness('remains_pending');
    reachReview();
    const { transactionId } = await coordinator.confirmReview();

    const languages: Language[] = ['hi', 'te', 'en'];

    // At UPI_SIMULATION
    for (const lang of languages) {
      controller.dispatch({ type: 'SWITCH_LANGUAGE', language: lang });
      assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');
      assert.strictEqual(controller.getState().transactionId, transactionId);
      assert.strictEqual(controller.getState().language, lang);
    }

    // Enter PROCESSING and resolve to PENDING
    await coordinator.confirmUpiHandoff();
    assert.strictEqual(controller.getState().stage, 'PENDING');

    // At PENDING
    for (const lang of languages) {
      controller.dispatch({ type: 'SWITCH_LANGUAGE', language: lang });
      assert.strictEqual(controller.getState().stage, 'PENDING');
      assert.strictEqual(controller.getState().transactionId, transactionId);
      assert.strictEqual(controller.getState().language, lang);
    }
  });

  await t.test('Stale result for old transaction cannot overwrite newly started transaction', async () => {
    const { controller, coordinator, reachReview, service } = createCheckoutTestHarness();
    reachReview();

    // Start Attempt 1
    const attempt1 = await coordinator.confirmReview();
    const txn1 = attempt1.transactionId!;

    // Delay response for Attempt 1
    let finishTxn1: (status: 'success') => void;
    service.getStatus = (id) => {
      if (id === txn1) {
        return new Promise((resolve) => {
          finishTxn1 = resolve;
        });
      }
      return Promise.resolve('success');
    };

    // User starts processing Attempt 1
    const p1 = coordinator.confirmUpiHandoff();

    // Suppose Attempt 1 failed or was interrupted, and user retried
    controller.dispatch({ type: 'PAYMENT_FAILURE' });
    assert.strictEqual(controller.getState().stage, 'FAILED');

    // User clicks retry: returns to METHOD and clears transaction
    coordinator.retry();
    assert.strictEqual(controller.getState().stage, 'METHOD');
    assert.strictEqual(controller.getState().transactionId, null);

    // User navigates back to REVIEW and starts Attempt 2
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    const attempt2 = await coordinator.confirmReview();
    const txn2 = attempt2.transactionId!;
    assert.notStrictEqual(txn1, txn2);
    assert.strictEqual(controller.getState().transactionId, txn2);
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');

    // Now delayed check from Attempt 1 resolves with 'success'
    finishTxn1!('success');
    const result1 = await p1;

    // Delayed Attempt 1 result must be discarded and NOT overwrite Attempt 2
    assert.strictEqual(result1.ok, false);
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');
    assert.strictEqual(controller.getState().transactionId, txn2, 'Transaction ID must remain txn2');
    assert.strictEqual(controller.getState().paymentStatus, 'unresolved');
  });
});
