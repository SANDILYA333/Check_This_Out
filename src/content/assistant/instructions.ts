import type { CheckoutStage, Language } from '../../guidance/types.ts';
import {
  getMessage,
  getStageMessageMapping,
  STAGE_MESSAGE_MAP,
} from '../../localization/index.ts';

export interface StageInfo {
  readonly title: string;
  readonly instruction: string;
  readonly stepNumber?: number;
  readonly totalSteps?: number;
  readonly pinWarning?: boolean;
}

export const UPI_PIN_SAFETY_WARNING = 'Never tell anyone your PIN.';

export function getStageInfo(stage: CheckoutStage, lang: Language): StageInfo {
  const mapping = getStageMessageMapping(stage);
  return {
    title: getMessage(lang, mapping.titleKey),
    instruction: getMessage(lang, mapping.instructionKey),
    stepNumber: mapping.stepNumber,
    totalSteps: mapping.totalSteps,
    pinWarning: mapping.hasPinWarning,
  };
}

const ALL_STAGES: readonly CheckoutStage[] = [
  'WELCOME',
  'LANGUAGE',
  'ADDRESS',
  'ADDRESS_CHANGE_STUB',
  'METHOD',
  'REVIEW',
  'UPI_SIMULATION',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'PENDING',
  'UNSUPPORTED',
] as const;

const ALL_LANGS: readonly Language[] = ['en', 'te', 'hi'] as const;

export const STAGE_DETAILS: Readonly<Record<CheckoutStage, Record<Language, StageInfo>>> = (
  () => {
    const details = {} as Record<CheckoutStage, Record<Language, StageInfo>>;
    for (const stage of ALL_STAGES) {
      details[stage] = {
        en: getStageInfo(stage, 'en'),
        te: getStageInfo(stage, 'te'),
        hi: getStageInfo(stage, 'hi'),
      };
    }
    return details;
  }
)();
