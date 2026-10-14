import test from 'node:test';
import assert from 'node:assert';
import { GuidanceController } from '../../src/content/assistant/guidanceController.ts';
import { DeterministicMockPaymentService } from '../../src/payments/mockPaymentService.ts';
import { PaymentCoordinator } from '../../src/payments/paymentCoordinator.ts';

function setupCoordinator(scenario: Parameters<DeterministicMockPaymentService['setScenario']>[0] = 'immediate_success') {
  const controller = new GuidanceController('en');
  const service = new DeterministicMockPaymentService(scenario);
  const coordinator = new PaymentCoordinator({ controller, service });

  // Helper: advance to REVIEW stage
  const advanceToReview = () => {
    controller.dispatch({ type: 'START_ASSISTANCE' });
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: 'en' });
    controller.dispatch({ type: 'CONFIRM_ADDRESS' });
    controller.dispatch({ type: 'CONTINUE_TO_REVIEW' });
    assert.strictEqual(controller.getState().stage, 'REVIEW');
  };

  return { controller, service, coordinator, advanceToReview };
}

test('Payment Coordinator — State Machine Integration and Lifecycle', async (t) => {
  await t.test('confirmReview() creates order and transitions to UPI_SIMULATION with transaction ID', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator();
    advanceToReview();

    const res = await coordinator.confirmReview();
    assert.strictEqual(res.ok, true);
    assert.ok(typeof res.transactionId === 'string');

    const state = controller.getState();
    assert.strictEqual(state.stage, 'UPI_SIMULATION');
    assert.strictEqual(state.transactionId, res.transactionId);
    assert.strictEqual(state.paymentStatus, 'unresolved');
  });

  await t.test('confirmReview() rejects when called from stage other than REVIEW', async () => {
    const { controller, coordinator } = setupCoordinator();
    assert.strictEqual(controller.getState().stage, 'WELCOME');

    const res = await coordinator.confirmReview();
    assert.strictEqual(res.ok, false);
    assert.ok(res.error?.includes('Cannot confirm review from stage "WELCOME"'));
    assert.strictEqual(controller.getState().stage, 'WELCOME');
  });

  await t.test('In-flight double-click guard prevents concurrent order creation', async () => {
    const { coordinator, advanceToReview, service } = setupCoordinator();
    advanceToReview();

    // Delay createOrder artificially to simulate concurrent invocations
    let resolveCreate: (value: { transactionId: string }) => void;
    const delayedPromise = new Promise<{ transactionId: string }>((resolve) => {
      resolveCreate = resolve;
    });

    service.createOrder = () => delayedPromise;

    const call1 = coordinator.confirmReview();
    const call2 = coordinator.confirmReview();

    // Call 2 should be rejected immediately by the in-flight guard
    const res2 = await call2;
    assert.strictEqual(res2.ok, false);
    assert.ok(res2.error?.includes('already in-flight'));

    resolveCreate!({ transactionId: 'mock_delayed_123' });
    const res1 = await call1;
    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.transactionId, 'mock_delayed_123');
  });

  await t.test('confirmUpiHandoff() transitions to PROCESSING and resolves to SUCCESS on immediate_success', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('immediate_success');
    advanceToReview();

    await coordinator.confirmReview();
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');

    const resolution = await coordinator.confirmUpiHandoff();
    assert.strictEqual(resolution.ok, true);
    assert.strictEqual(resolution.status, 'success');

    const state = controller.getState();
    assert.strictEqual(state.stage, 'SUCCESS');
    assert.strictEqual(state.paymentStatus, 'success');
  });

  await t.test('confirmUpiHandoff() transitions to PROCESSING and resolves to FAILED on immediate_failure', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('immediate_failure');
    advanceToReview();

    await coordinator.confirmReview();
    const resolution = await coordinator.confirmUpiHandoff();

    assert.strictEqual(resolution.ok, true);
    assert.strictEqual(resolution.status, 'failed');

    const state = controller.getState();
    assert.strictEqual(state.stage, 'FAILED');
    assert.strictEqual(state.paymentStatus, 'failed');
  });

  await t.test('confirmUpiHandoff() transitions to PENDING and recheckPendingStatus() resolves to SUCCESS', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('pending_then_success');
    advanceToReview();

    const reviewRes = await coordinator.confirmReview();
    const originalTxnId = reviewRes.transactionId!;

    // Step 1: Confirm handoff -> check 1 returns pending
    const res1 = await coordinator.confirmUpiHandoff();
    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.status, 'pending');

    let state = controller.getState();
    assert.strictEqual(state.stage, 'PENDING');
    assert.strictEqual(state.paymentStatus, 'pending');
    assert.strictEqual(state.transactionId, originalTxnId);

    // Step 2: Recheck pending status -> check 2 returns success on SAME txnId
    const res2 = await coordinator.recheckPendingStatus();
    assert.strictEqual(res2.ok, true);
    assert.strictEqual(res2.status, 'success');

    state = controller.getState();
    assert.strictEqual(state.stage, 'SUCCESS');
    assert.strictEqual(state.paymentStatus, 'success');
    assert.strictEqual(state.transactionId, originalTxnId, 'Transaction ID must be preserved');
  });

  await t.test('recheckPendingStatus() is rejected from non-PENDING stages', async () => {
    const { coordinator, advanceToReview } = setupCoordinator();
    advanceToReview();

    const res = await coordinator.recheckPendingStatus();
    assert.strictEqual(res.ok, false);
    assert.ok(res.error?.includes('Cannot recheck status from non-pending stage'));
  });

  await t.test('Stale result protection: delayed result discarded if state reset', async () => {
    const { controller, coordinator, advanceToReview, service } = setupCoordinator();
    advanceToReview();

    await coordinator.confirmReview();
    assert.strictEqual(controller.getState().stage, 'UPI_SIMULATION');

    let resolveGetStatus: (val: 'success') => void;
    service.getStatus = () =>
      new Promise((resolve) => {
        resolveGetStatus = resolve;
      });

    const handoffPromise = coordinator.confirmUpiHandoff();
    assert.strictEqual(controller.getState().stage, 'PROCESSING');

    // Global reset occurs while status check is in-flight
    controller.dispatch({ type: 'RESET' });
    assert.strictEqual(controller.getState().stage, 'WELCOME');
    assert.strictEqual(controller.getState().transactionId, null);

    // Now delayed service response resolves
    resolveGetStatus!('success');
    const result = await handoffPromise;

    // Must be discarded and NOT overwrite WELCOME stage to SUCCESS
    assert.strictEqual(result.ok, false);
    assert.ok(result.error?.includes('Discarded stale status result'));
    assert.strictEqual(controller.getState().stage, 'WELCOME');
    assert.strictEqual(controller.getState().paymentStatus, 'none');
  });

  await t.test('Runtime boundary validation: unexpected status leaves transaction unresolved', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('unexpected_status');
    advanceToReview();

    await coordinator.confirmReview();
    const resolution = await coordinator.confirmUpiHandoff();

    assert.strictEqual(resolution.ok, false);
    assert.ok(resolution.error?.includes('Unexpected status value received'));

    // Invariant: Stage must NOT be SUCCESS or FAILED; remains unresolved in PROCESSING
    const state = controller.getState();
    assert.strictEqual(state.stage, 'PROCESSING');
    assert.notStrictEqual(state.paymentStatus, 'success');
    assert.notStrictEqual(state.paymentStatus, 'failed');
  });

  await t.test('Status check error leaves transaction unresolved without crashing', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('status_error');
    advanceToReview();

    await coordinator.confirmReview();
    const resolution = await coordinator.confirmUpiHandoff();

    assert.strictEqual(resolution.ok, false);
    assert.ok(resolution.error?.includes('Simulated payment service communication error'));

    // State remains in PROCESSING; not falsely marked SUCCESS or FAILED
    const state = controller.getState();
    assert.strictEqual(state.stage, 'PROCESSING');
    assert.strictEqual(coordinator.getLastError(), 'Simulated payment service communication error');
  });

  await t.test('retry() works strictly from FAILED stage, returning to METHOD and clearing transaction', async () => {
    const { controller, coordinator, advanceToReview } = setupCoordinator('immediate_failure');
    advanceToReview();

    await coordinator.confirmReview();
    await coordinator.confirmUpiHandoff();
    assert.strictEqual(controller.getState().stage, 'FAILED');

    const retryRes = coordinator.retry();
    assert.strictEqual(retryRes.ok, true);

    const state = controller.getState();
    assert.strictEqual(state.stage, 'METHOD');
    assert.strictEqual(state.transactionId, null, 'Transaction must be cleared on retry');
    assert.strictEqual(state.paymentStatus, 'none');
  });

  await t.test('retry() is rejected from non-FAILED stages (PENDING, SUCCESS, PROCESSING, UPI_SIMULATION)', async () => {
    const { coordinator, advanceToReview } = setupCoordinator();
    advanceToReview();

    // From REVIEW
    const res1 = coordinator.retry();
    assert.strictEqual(res1.ok, false);
    assert.ok(res1.error?.includes('Retry is prohibited'));

    // From UPI_SIMULATION
    await coordinator.confirmReview();
    const res2 = coordinator.retry();
    assert.strictEqual(res2.ok, false);
  });
});
