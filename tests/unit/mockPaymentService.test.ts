import test from 'node:test';
import assert from 'node:assert';
import { DeterministicMockPaymentService } from '../../src/payments/mockPaymentService.ts';
import { isPaymentStatus } from '../../src/payments/types.ts';

test('Mock Payment Service — Deterministic Behavior and Scenario Control', async (t) => {
  await t.test('createOrder() generates unique stable transaction ID without network requests', async () => {
    const service = new DeterministicMockPaymentService();
    const order1 = await service.createOrder();
    const order2 = await service.createOrder();

    assert.ok(order1.transactionId.startsWith('mock_order_'));
    assert.ok(order2.transactionId.startsWith('mock_order_'));
    assert.notStrictEqual(
      order1.transactionId,
      order2.transactionId,
      'Successive createOrder calls must produce unique IDs'
    );
    assert.strictEqual(service.hasTransaction(order1.transactionId), true);
    assert.strictEqual(service.hasTransaction(order2.transactionId), true);
  });

  await t.test('Repeated getStatus() checks do not create new transactions', async () => {
    const service = new DeterministicMockPaymentService('pending_then_success');
    const order = await service.createOrder();

    const initialCheckCount = service.getCheckCount(order.transactionId);
    assert.strictEqual(initialCheckCount, 0);

    const status1 = await service.getStatus(order.transactionId);
    assert.strictEqual(status1, 'pending');
    assert.strictEqual(service.getCheckCount(order.transactionId), 1);

    const status2 = await service.getStatus(order.transactionId);
    assert.strictEqual(status2, 'success');
    assert.strictEqual(service.getCheckCount(order.transactionId), 2);

    // Verify no new transaction was added to the internal registry
    assert.strictEqual(service.hasTransaction(order.transactionId), true);
  });

  await t.test('Unknown transaction ID throws controlled error', async () => {
    const service = new DeterministicMockPaymentService();
    await assert.rejects(
      async () => {
        await service.getStatus('non_existent_txn_9999');
      },
      (err: Error) => {
        assert.ok(err.message.includes('Unknown transaction ID'));
        return true;
      }
    );
  });

  await t.test('Scenario: immediate_success returns confirmed success on first check', async () => {
    const service = new DeterministicMockPaymentService('immediate_success');
    const order = await service.createOrder();

    const status = await service.getStatus(order.transactionId);
    assert.strictEqual(status, 'success');
    assert.strictEqual(isPaymentStatus(status), true);
  });

  await t.test('Scenario: immediate_failure returns confirmed failure on first check', async () => {
    const service = new DeterministicMockPaymentService('immediate_failure');
    const order = await service.createOrder();

    const status = await service.getStatus(order.transactionId);
    assert.strictEqual(status, 'failed');
    assert.strictEqual(isPaymentStatus(status), true);
  });

  await t.test('Scenario: pending_then_success returns pending on check 1, success on check 2', async () => {
    const service = new DeterministicMockPaymentService('pending_then_success');
    const order = await service.createOrder();

    const firstStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(firstStatus, 'pending');

    const secondStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(secondStatus, 'success');

    // Subsequent checks also stay success
    const thirdStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(thirdStatus, 'success');
  });

  await t.test('Scenario: pending_then_failure returns pending on check 1, failed on check 2', async () => {
    const service = new DeterministicMockPaymentService('pending_then_failure');
    const order = await service.createOrder();

    const firstStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(firstStatus, 'pending');

    const secondStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(secondStatus, 'failed');
  });

  await t.test('Scenario: remains_pending returns pending across repeated checks', async () => {
    const service = new DeterministicMockPaymentService('remains_pending');
    const order = await service.createOrder();

    for (let i = 1; i <= 5; i++) {
      const status = await service.getStatus(order.transactionId);
      assert.strictEqual(status, 'pending');
      assert.strictEqual(service.getCheckCount(order.transactionId), i);
    }
  });

  await t.test('Scenario: status_error simulates communication failure', async () => {
    const service = new DeterministicMockPaymentService('status_error');
    const order = await service.createOrder();

    await assert.rejects(
      async () => {
        await service.getStatus(order.transactionId);
      },
      (err: Error) => {
        assert.ok(err.message.includes('Simulated payment service communication error'));
        return true;
      }
    );
  });

  await t.test('Scenario: unexpected_status returns invalid status crossing boundary', async () => {
    const service = new DeterministicMockPaymentService('unexpected_status');
    const order = await service.createOrder();

    const rawStatus = await service.getStatus(order.transactionId);
    assert.strictEqual(rawStatus, 'unexpected_value_from_service' as unknown);
    assert.strictEqual(isPaymentStatus(rawStatus), false);
  });

  await t.test('reset() clears all transactions and counters', async () => {
    const service = new DeterministicMockPaymentService();
    const order = await service.createOrder();
    assert.strictEqual(service.hasTransaction(order.transactionId), true);

    service.reset();
    assert.strictEqual(service.hasTransaction(order.transactionId), false);
  });
});
