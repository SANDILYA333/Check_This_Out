export type { Language, MessageKey, LocalizationDictionary } from './types.ts';
export { CANONICAL_MESSAGE_KEYS, isCanonicalMessageKey } from './messageKeys.ts';
export { DICTIONARIES, getDictionary, getMessage } from './dictionaries/index.ts';
export { enDictionary } from './dictionaries/en.ts';
export { hiDictionary } from './dictionaries/hi.ts';
export { teDictionary } from './dictionaries/te.ts';
export { STAGE_MESSAGE_MAP, getStageMessageMapping, type StageMessageMapping } from './stageMessages.ts';
