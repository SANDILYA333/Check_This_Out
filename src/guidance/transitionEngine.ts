import type {
  CheckoutAction,
  CheckoutState,
  TransitionResult,
} from './types.ts';
import { isSupportedLanguage } from './types.ts';
import { generateMockTransactionId, STAGE_TARGET_MAP } from './transitionRules.ts';

function reject(state: CheckoutState, error: string): TransitionResult {
  return {
    ok: false,
    error,
    state,
  };
}

function accept(state: CheckoutState): TransitionResult {
  return {
    ok: true,
    state,
  };
}

/**
 * Deterministic checkout guidance state transition engine.
 * Pure function: accepts (currentState, action) and returns TransitionResult.
 *
 * Invariant rules enforced:
 * 1. Independent of React rendering.
 * 2. Unhandled or invalid events return the unchanged original state with error explanation.
 * 3. Language switching preserves stage, transaction ID, and payment status.
 * 4. Transactions created strictly at the CONFIRM_REVIEW boundary.
 * 5. Back from UPI_SIMULATION discards the unused transaction.
 * 6. PROCESSING requires an existing transaction.
 * 7. SUCCESS requires an explicit PAYMENT_SUCCESS event and existing transaction.
 * 8. Back navigation prohibited from PROCESSING, SUCCESS, FAILED, and PENDING.
 * 9. RETRY allowed strictly from FAILED; rejected from PENDING, SUCCESS, PROCESSING, etc.
 */
export function transition(
  currentState: CheckoutState,
  action: CheckoutAction
): TransitionResult {
  // Global action: SWITCH_LANGUAGE (allowed in all states, preserves all other state fields)
  if (action.type === 'SWITCH_LANGUAGE') {
    if (!isSupportedLanguage(action.language)) {
      return reject(
        currentState,
        `Unsupported language: "${String((action as { language?: unknown }).language)}"`
      );
    }
    return accept({
      ...currentState,
      language: action.language,
    });
  }

  // Global action: MARK_UNSUPPORTED
  if (action.type === 'MARK_UNSUPPORTED') {
    return accept({
      ...currentState,
      stage: 'UNSUPPORTED',
      targetId: null,
    });
  }

  // Global action: RESET
  if (action.type === 'RESET') {
    return accept({
      stage: 'WELCOME',
      language: currentState.language,
      targetId: null,
      transactionId: null,
      paymentStatus: 'none',
    });
  }

  switch (currentState.stage) {
    case 'WELCOME': {
      if (action.type === 'START_ASSISTANCE') {
        return accept({
          ...currentState,
          stage: 'LANGUAGE',
          targetId: STAGE_TARGET_MAP.LANGUAGE,
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in WELCOME stage.`
      );
    }

    case 'LANGUAGE': {
      if (action.type === 'SELECT_LANGUAGE') {
        if (!isSupportedLanguage(action.language)) {
          return reject(
            currentState,
            `Unsupported language: "${String((action as { language?: unknown }).language)}"`
          );
        }
        return accept({
          ...currentState,
          stage: 'ADDRESS',
          language: action.language,
          targetId: STAGE_TARGET_MAP.ADDRESS,
        });
      }
      if (action.type === 'START_ASSISTANCE') {
        return reject(
          currentState,
          'Assistance is already active. Cannot restart an active checkout flow.'
        );
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in LANGUAGE stage.`
      );
    }

    case 'ADDRESS': {
      if (action.type === 'START_ASSISTANCE') {
        return reject(
          currentState,
          'Assistance is already active. Cannot restart an active checkout flow.'
        );
      }
      if (action.type === 'CONFIRM_ADDRESS') {
        return accept({
          ...currentState,
          stage: 'METHOD',
          targetId: STAGE_TARGET_MAP.METHOD,
        });
      }
      if (action.type === 'REQUEST_ADDRESS_CHANGE') {
        return accept({
          ...currentState,
          stage: 'ADDRESS_CHANGE_STUB',
          targetId: STAGE_TARGET_MAP.ADDRESS_CHANGE_STUB,
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in ADDRESS stage.`
      );
    }

    case 'ADDRESS_CHANGE_STUB': {
      if (action.type === 'BACK') {
        return accept({
          ...currentState,
          stage: 'ADDRESS',
          targetId: STAGE_TARGET_MAP.ADDRESS,
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in ADDRESS_CHANGE_STUB stage.`
      );
    }

    case 'METHOD': {
      if (action.type === 'START_ASSISTANCE') {
        return reject(
          currentState,
          'Assistance is already active. Cannot restart an active checkout flow.'
        );
      }
      if (action.type === 'BACK') {
        return accept({
          ...currentState,
          stage: 'ADDRESS',
          targetId: STAGE_TARGET_MAP.ADDRESS,
        });
      }
      if (action.type === 'CONTINUE_TO_REVIEW') {
        return accept({
          ...currentState,
          stage: 'REVIEW',
          targetId: STAGE_TARGET_MAP.REVIEW,
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in METHOD stage.`
      );
    }

    case 'REVIEW': {
      if (action.type === 'START_ASSISTANCE') {
        return reject(
          currentState,
          'Assistance is already active. Cannot restart an active checkout flow.'
        );
      }
      if (action.type === 'BACK') {
        return accept({
          ...currentState,
          stage: 'METHOD',
          targetId: STAGE_TARGET_MAP.METHOD,
        });
      }
      if (action.type === 'CONFIRM_REVIEW') {
        // Transaction creation boundary: exactly one mock transaction ID is created / attached
        const txnId =
          action.transactionId && action.transactionId.trim().length > 0
            ? action.transactionId
            : generateMockTransactionId();

        return accept({
          ...currentState,
          stage: 'UPI_SIMULATION',
          targetId: STAGE_TARGET_MAP.UPI_SIMULATION,
          transactionId: txnId,
          paymentStatus: 'unresolved',
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in REVIEW stage.`
      );
    }

    case 'UPI_SIMULATION': {
      if (action.type === 'START_ASSISTANCE') {
        return reject(
          currentState,
          'Assistance is already active. Cannot restart an active checkout flow.'
        );
      }
      if (action.type === 'BACK') {
        // Back from UPI_SIMULATION discards the unused transaction
        return accept({
          ...currentState,
          stage: 'REVIEW',
          targetId: STAGE_TARGET_MAP.REVIEW,
          transactionId: null,
          paymentStatus: 'none',
        });
      }
      if (action.type === 'CONFIRM_UPI_HANDOFF') {
        if (!currentState.transactionId) {
          return reject(
            currentState,
            'Cannot enter processing without an active transaction ID.'
          );
        }
        return accept({
          ...currentState,
          stage: 'PROCESSING',
          targetId: STAGE_TARGET_MAP.PROCESSING,
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in UPI_SIMULATION stage.`
      );
    }

    case 'PROCESSING': {
      if (action.type === 'BACK') {
        return reject(
          currentState,
          'Ordinary back navigation is prohibited while payment is in-flight.'
        );
      }
      if (action.type === 'RETRY') {
        return reject(
          currentState,
          'Cannot retry payment while status is processing.'
        );
      }
      if (action.type === 'PAYMENT_SUCCESS') {
        if (!currentState.transactionId) {
          return reject(
            currentState,
            'Cannot transition to SUCCESS without a valid transaction ID.'
          );
        }
        return accept({
          ...currentState,
          stage: 'SUCCESS',
          targetId: STAGE_TARGET_MAP.SUCCESS,
          paymentStatus: 'success',
        });
      }
      if (action.type === 'PAYMENT_FAILURE') {
        return accept({
          ...currentState,
          stage: 'FAILED',
          targetId: STAGE_TARGET_MAP.FAILED,
          paymentStatus: 'failed',
        });
      }
      if (action.type === 'PAYMENT_PENDING') {
        return accept({
          ...currentState,
          stage: 'PENDING',
          targetId: STAGE_TARGET_MAP.PENDING,
          paymentStatus: 'pending',
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in PROCESSING stage.`
      );
    }

    case 'PENDING': {
      if (action.type === 'BACK') {
        return reject(
          currentState,
          'Ordinary back navigation is prohibited from pending payment state.'
        );
      }
      if (action.type === 'RETRY') {
        return reject(
          currentState,
          'Cannot retry payment while transaction status is pending. Do not pay again.'
        );
      }
      if (action.type === 'PAYMENT_SUCCESS') {
        if (!currentState.transactionId) {
          return reject(
            currentState,
            'Cannot transition to SUCCESS without a valid transaction ID.'
          );
        }
        return accept({
          ...currentState,
          stage: 'SUCCESS',
          targetId: STAGE_TARGET_MAP.SUCCESS,
          paymentStatus: 'success',
        });
      }
      if (action.type === 'PAYMENT_FAILURE') {
        return accept({
          ...currentState,
          stage: 'FAILED',
          targetId: STAGE_TARGET_MAP.FAILED,
          paymentStatus: 'failed',
        });
      }
      if (action.type === 'PAYMENT_PENDING') {
        // Status remains pending; reuse same transaction ID
        return accept(currentState);
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in PENDING stage.`
      );
    }

    case 'FAILED': {
      if (action.type === 'BACK') {
        return reject(
          currentState,
          'Ordinary back navigation is prohibited from failed state; use RETRY instead.'
        );
      }
      if (action.type === 'RETRY') {
        // Retrying returns to METHOD, clearing the failed transaction
        // A new transaction will only be created when the user reaches REVIEW and confirms again
        return accept({
          ...currentState,
          stage: 'METHOD',
          targetId: STAGE_TARGET_MAP.METHOD,
          transactionId: null,
          paymentStatus: 'none',
        });
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in FAILED stage.`
      );
    }

    case 'SUCCESS': {
      if (action.type === 'BACK') {
        return reject(
          currentState,
          'Ordinary back navigation is prohibited from completed SUCCESS state.'
        );
      }
      if (action.type === 'RETRY') {
        return reject(
          currentState,
          'Cannot retry a transaction that has already succeeded.'
        );
      }
      return reject(
        currentState,
        `Invalid action "${action.type}" in SUCCESS stage.`
      );
    }

    case 'UNSUPPORTED': {
      return reject(
        currentState,
        `Cannot execute "${action.type}" on an UNSUPPORTED page.`
      );
    }

    default: {
      const _exhaustiveCheck: never = currentState.stage;
      return reject(
        currentState,
        `Unknown stage: "${String(_exhaustiveCheck)}"`
      );
    }
  }
}
