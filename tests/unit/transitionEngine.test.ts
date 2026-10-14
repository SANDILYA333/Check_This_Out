import test from 'node:test';
import assert from 'node:assert';
import { createInitialState } from '../../src/guidance/initialState.ts';
import { transition } from '../../src/guidance/transitionEngine.ts';
import type { CheckoutState, Language } from '../../src/guidance/types.ts';
import { resetTransactionCounter } from '../../src/guidance/transitionRules.ts';

test('Transition Engine — Canonical Flow Valid Transitions', async (t) => {
  resetTransactionCounter();

  await t.test('WELCOME -> LANGUAGE via START_ASSISTANCE', () => {
    const s0 = createInitialState('en');
    const res = transition(s0, { type: 'START_ASSISTANCE' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'LANGUAGE');
    assert.strictEqual(res.state.language, 'en');
    assert.strictEqual(res.state.transactionId, null);
    assert.strictEqual(res.state.paymentStatus, 'none');
  });

  await t.test('LANGUAGE -> ADDRESS via SELECT_LANGUAGE', () => {
    const s0: CheckoutState = {
      stage: 'LANGUAGE',
      language: 'en',
      targetId: null,
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'SELECT_LANGUAGE', language: 'te' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'ADDRESS');
    assert.strictEqual(res.state.language, 'te');
    assert.strictEqual(res.state.targetId, 'confirm-address');
  });

  await t.test('ADDRESS -> METHOD via CONFIRM_ADDRESS', () => {
    const s0: CheckoutState = {
      stage: 'ADDRESS',
      language: 'te',
      targetId: 'confirm-address',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'CONFIRM_ADDRESS' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'METHOD');
    assert.strictEqual(res.state.targetId, 'payment-method');
  });

  await t.test('ADDRESS -> ADDRESS_CHANGE_STUB and BACK to ADDRESS', () => {
    const s0: CheckoutState = {
      stage: 'ADDRESS',
      language: 'hi',
      targetId: 'confirm-address',
      transactionId: null,
      paymentStatus: 'none',
    };
    const toStub = transition(s0, { type: 'REQUEST_ADDRESS_CHANGE' });
    assert.strictEqual(toStub.ok, true);
    if (!toStub.ok) return;
    assert.strictEqual(toStub.state.stage, 'ADDRESS_CHANGE_STUB');
    assert.strictEqual(toStub.state.targetId, 'change-address');

    const backToAddress = transition(toStub.state, { type: 'BACK' });
    assert.strictEqual(backToAddress.ok, true);
    if (!backToAddress.ok) return;
    assert.strictEqual(backToAddress.state.stage, 'ADDRESS');
    assert.strictEqual(backToAddress.state.targetId, 'confirm-address');
  });

  await t.test('METHOD -> ADDRESS via BACK and METHOD -> REVIEW via CONTINUE_TO_REVIEW', () => {
    const s0: CheckoutState = {
      stage: 'METHOD',
      language: 'en',
      targetId: 'payment-method',
      transactionId: null,
      paymentStatus: 'none',
    };
    const backRes = transition(s0, { type: 'BACK' });
    assert.strictEqual(backRes.ok, true);
    if (!backRes.ok) return;
    assert.strictEqual(backRes.state.stage, 'ADDRESS');

    const contRes = transition(s0, { type: 'CONTINUE_TO_REVIEW' });
    assert.strictEqual(contRes.ok, true);
    if (!contRes.ok) return;
    assert.strictEqual(contRes.state.stage, 'REVIEW');
    assert.strictEqual(contRes.state.targetId, 'confirm-review');
  });

  await t.test('REVIEW -> METHOD via BACK', () => {
    const s0: CheckoutState = {
      stage: 'REVIEW',
      language: 'en',
      targetId: 'confirm-review',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'BACK' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'METHOD');
  });

  await t.test('REVIEW -> UPI_SIMULATION attaches transaction ID', () => {
    const s0: CheckoutState = {
      stage: 'REVIEW',
      language: 'te',
      targetId: 'confirm-review',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'CONFIRM_REVIEW' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'UPI_SIMULATION');
    assert.strictEqual(res.state.targetId, 'confirm-upi-handoff');
    assert.ok(res.state.transactionId && res.state.transactionId.startsWith('vc_txn_'));
    assert.strictEqual(res.state.paymentStatus, 'unresolved');
  });

  await t.test('UPI_SIMULATION -> REVIEW via BACK discards unused transaction', () => {
    const s0: CheckoutState = {
      stage: 'UPI_SIMULATION',
      language: 'te',
      targetId: 'confirm-upi-handoff',
      transactionId: 'vc_txn_test123',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'BACK' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'REVIEW');
    assert.strictEqual(res.state.transactionId, null);
    assert.strictEqual(res.state.paymentStatus, 'none');
  });

  await t.test('UPI_SIMULATION -> PROCESSING via CONFIRM_UPI_HANDOFF preserves transaction ID', () => {
    const s0: CheckoutState = {
      stage: 'UPI_SIMULATION',
      language: 'en',
      targetId: 'confirm-upi-handoff',
      transactionId: 'vc_txn_456',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'CONFIRM_UPI_HANDOFF' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'PROCESSING');
    assert.strictEqual(res.state.transactionId, 'vc_txn_456');
    assert.strictEqual(res.state.paymentStatus, 'unresolved');
  });

  await t.test('PROCESSING -> SUCCESS via PAYMENT_SUCCESS', () => {
    const s0: CheckoutState = {
      stage: 'PROCESSING',
      language: 'hi',
      targetId: null,
      transactionId: 'vc_txn_789',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'PAYMENT_SUCCESS' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'SUCCESS');
    assert.strictEqual(res.state.paymentStatus, 'success');
    assert.strictEqual(res.state.transactionId, 'vc_txn_789');
  });

  await t.test('PROCESSING -> FAILED via PAYMENT_FAILURE', () => {
    const s0: CheckoutState = {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_fail_1',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'PAYMENT_FAILURE' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'FAILED');
    assert.strictEqual(res.state.paymentStatus, 'failed');
    assert.strictEqual(res.state.transactionId, 'vc_txn_fail_1');
  });

  await t.test('PROCESSING -> PENDING via PAYMENT_PENDING', () => {
    const s0: CheckoutState = {
      stage: 'PROCESSING',
      language: 'te',
      targetId: null,
      transactionId: 'vc_txn_pend_1',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'PAYMENT_PENDING' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'PENDING');
    assert.strictEqual(res.state.paymentStatus, 'pending');
    assert.strictEqual(res.state.transactionId, 'vc_txn_pend_1');
  });

  await t.test('PENDING resolution to SUCCESS and FAILED', () => {
    const pendingState: CheckoutState = {
      stage: 'PENDING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_pend_2',
      paymentStatus: 'pending',
    };

    const succ = transition(pendingState, { type: 'PAYMENT_SUCCESS' });
    assert.strictEqual(succ.ok, true);
    if (!succ.ok) return;
    assert.strictEqual(succ.state.stage, 'SUCCESS');
    assert.strictEqual(succ.state.paymentStatus, 'success');
    assert.strictEqual(succ.state.transactionId, 'vc_txn_pend_2');

    const fail = transition(pendingState, { type: 'PAYMENT_FAILURE' });
    assert.strictEqual(fail.ok, true);
    if (!fail.ok) return;
    assert.strictEqual(fail.state.stage, 'FAILED');
    assert.strictEqual(fail.state.paymentStatus, 'failed');
    assert.strictEqual(fail.state.transactionId, 'vc_txn_pend_2');

    // Repeated pending check reuses same state
    const same = transition(pendingState, { type: 'PAYMENT_PENDING' });
    assert.strictEqual(same.ok, true);
    if (!same.ok) return;
    assert.strictEqual(same.state.stage, 'PENDING');
    assert.strictEqual(same.state.transactionId, 'vc_txn_pend_2');
  });

  await t.test('FAILED -> METHOD via RETRY clears transaction for safe restart', () => {
    const s0: CheckoutState = {
      stage: 'FAILED',
      language: 'hi',
      targetId: null,
      transactionId: 'vc_txn_failed_old',
      paymentStatus: 'failed',
    };
    const res = transition(s0, { type: 'RETRY' });
    assert.strictEqual(res.ok, true);
    if (!res.ok) return;
    assert.strictEqual(res.state.stage, 'METHOD');
    assert.strictEqual(res.state.targetId, 'payment-method');
    assert.strictEqual(res.state.transactionId, null);
    assert.strictEqual(res.state.paymentStatus, 'none');
  });
});

test('Transition Engine — Rejection of Invalid Transitions', async (t) => {
  await t.test('Double start assistance does not restart active flow', () => {
    const s0: CheckoutState = {
      stage: 'ADDRESS',
      language: 'en',
      targetId: 'confirm-address',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'START_ASSISTANCE' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0); // Must preserve original state exactly
  });

  await t.test('Confirming address from WELCOME is rejected', () => {
    const s0 = createInitialState('en');
    const res = transition(s0, { type: 'CONFIRM_ADDRESS' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Selecting unsupported language is rejected', () => {
    const s0: CheckoutState = {
      stage: 'LANGUAGE',
      language: 'en',
      targetId: null,
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, {
      type: 'SELECT_LANGUAGE',
      language: 'fr' as unknown as Language,
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Skipping METHOD from ADDRESS to REVIEW is rejected', () => {
    const s0: CheckoutState = {
      stage: 'ADDRESS',
      language: 'en',
      targetId: 'confirm-address',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'CONTINUE_TO_REVIEW' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Entering PROCESSING without a transaction ID is rejected', () => {
    const s0: CheckoutState = {
      stage: 'UPI_SIMULATION',
      language: 'en',
      targetId: 'confirm-upi-handoff',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(s0, { type: 'CONFIRM_UPI_HANDOFF' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Entering SUCCESS without a transaction ID is rejected', () => {
    const s0: CheckoutState = {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: null,
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'PAYMENT_SUCCESS' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Entering SUCCESS without an explicit PAYMENT_SUCCESS event is rejected', () => {
    const s0: CheckoutState = {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'unresolved',
    };
    const res = transition(s0, { type: 'CONFIRM_UPI_HANDOFF' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, s0);
  });

  await t.test('Retry is rejected from PENDING, SUCCESS, and PROCESSING', () => {
    const pendingState: CheckoutState = {
      stage: 'PENDING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'pending',
    };
    assert.strictEqual(transition(pendingState, { type: 'RETRY' }).ok, false);

    const successState: CheckoutState = {
      stage: 'SUCCESS',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'success',
    };
    assert.strictEqual(transition(successState, { type: 'RETRY' }).ok, false);

    const processingState: CheckoutState = {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'unresolved',
    };
    assert.strictEqual(transition(processingState, { type: 'RETRY' }).ok, false);
  });

  await t.test('Ordinary Back navigation is rejected from terminal and in-flight states', () => {
    const processing: CheckoutState = {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'unresolved',
    };
    assert.strictEqual(transition(processing, { type: 'BACK' }).ok, false);

    const pending: CheckoutState = {
      stage: 'PENDING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'pending',
    };
    assert.strictEqual(transition(pending, { type: 'BACK' }).ok, false);

    const success: CheckoutState = {
      stage: 'SUCCESS',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'success',
    };
    assert.strictEqual(transition(success, { type: 'BACK' }).ok, false);

    const failed: CheckoutState = {
      stage: 'FAILED',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_1',
      paymentStatus: 'failed',
    };
    assert.strictEqual(transition(failed, { type: 'BACK' }).ok, false);
  });
});

test('Transition Engine — Language Preservation across all stages', async (t) => {
  const stagesToTest: CheckoutState[] = [
    {
      stage: 'ADDRESS',
      language: 'en',
      targetId: 'confirm-address',
      transactionId: null,
      paymentStatus: 'none',
    },
    {
      stage: 'METHOD',
      language: 'en',
      targetId: 'payment-method',
      transactionId: null,
      paymentStatus: 'none',
    },
    {
      stage: 'REVIEW',
      language: 'en',
      targetId: 'confirm-review',
      transactionId: null,
      paymentStatus: 'none',
    },
    {
      stage: 'UPI_SIMULATION',
      language: 'en',
      targetId: 'confirm-upi-handoff',
      transactionId: 'vc_txn_persist_1',
      paymentStatus: 'unresolved',
    },
    {
      stage: 'PROCESSING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_persist_2',
      paymentStatus: 'unresolved',
    },
    {
      stage: 'SUCCESS',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_persist_3',
      paymentStatus: 'success',
    },
    {
      stage: 'FAILED',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_persist_4',
      paymentStatus: 'failed',
    },
    {
      stage: 'PENDING',
      language: 'en',
      targetId: null,
      transactionId: 'vc_txn_persist_5',
      paymentStatus: 'pending',
    },
  ];

  for (const baseState of stagesToTest) {
    await t.test(`Preserves state when switching language at ${baseState.stage}`, () => {
      for (const targetLang of ['te', 'hi', 'en'] as const) {
        const res = transition(baseState, {
          type: 'SWITCH_LANGUAGE',
          language: targetLang,
        });

        assert.strictEqual(res.ok, true);
        if (!res.ok) return;

        assert.strictEqual(res.state.stage, baseState.stage);
        assert.strictEqual(res.state.transactionId, baseState.transactionId);
        assert.strictEqual(res.state.paymentStatus, baseState.paymentStatus);
        assert.strictEqual(res.state.targetId, baseState.targetId);
        assert.strictEqual(res.state.language, targetLang);
      }
    });
  }

  await t.test('SWITCH_LANGUAGE rejects invalid language and keeps original state', () => {
    const state: CheckoutState = {
      stage: 'REVIEW',
      language: 'en',
      targetId: 'confirm-review',
      transactionId: null,
      paymentStatus: 'none',
    };
    const res = transition(state, {
      type: 'SWITCH_LANGUAGE',
      language: 'es' as unknown as Language,
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state, state);
  });
});
