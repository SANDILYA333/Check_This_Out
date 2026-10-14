import type { CheckoutStage } from '../guidance/types.ts';
import type { MessageKey } from './types.ts';

export interface StageMessageMapping {
  titleKey: MessageKey;
  instructionKey: MessageKey;
  stepNumber?: number;
  totalSteps?: number;
  hasPinWarning: boolean;
}

export const STAGE_MESSAGE_MAP: Record<CheckoutStage, StageMessageMapping> = {
  WELCOME: {
    titleKey: 'assistant_title',
    instructionKey: 'welcome_instruction',
    hasPinWarning: false,
  },
  LANGUAGE: {
    titleKey: 'assistant_title',
    instructionKey: 'language_instruction',
    hasPinWarning: false,
  },
  ADDRESS: {
    titleKey: 'assistant_title',
    instructionKey: 'address_instruction',
    stepNumber: 1,
    totalSteps: 4,
    hasPinWarning: false,
  },
  ADDRESS_CHANGE_STUB: {
    titleKey: 'assistant_title',
    instructionKey: 'address_change_instruction',
    stepNumber: 1,
    totalSteps: 4,
    hasPinWarning: false,
  },
  METHOD: {
    titleKey: 'assistant_title',
    instructionKey: 'method_instruction',
    stepNumber: 2,
    totalSteps: 4,
    hasPinWarning: false,
  },
  REVIEW: {
    titleKey: 'assistant_title',
    instructionKey: 'review_instruction',
    stepNumber: 3,
    totalSteps: 4,
    hasPinWarning: false,
  },
  UPI_SIMULATION: {
    titleKey: 'assistant_title',
    instructionKey: 'upi_simulation_instruction',
    stepNumber: 4,
    totalSteps: 4,
    hasPinWarning: true,
  },
  PROCESSING: {
    titleKey: 'assistant_title',
    instructionKey: 'processing_instruction',
    hasPinWarning: false,
  },
  SUCCESS: {
    titleKey: 'assistant_title',
    instructionKey: 'success_instruction',
    hasPinWarning: false,
  },
  FAILED: {
    titleKey: 'assistant_title',
    instructionKey: 'failed_instruction',
    hasPinWarning: false,
  },
  PENDING: {
    titleKey: 'assistant_title',
    instructionKey: 'pending_instruction',
    hasPinWarning: false,
  },
  UNSUPPORTED: {
    titleKey: 'assistant_title',
    instructionKey: 'unsupported_page',
    hasPinWarning: false,
  },
};

export function getStageMessageMapping(stage: CheckoutStage): StageMessageMapping {
  return STAGE_MESSAGE_MAP[stage] ?? STAGE_MESSAGE_MAP.UNSUPPORTED;
}
