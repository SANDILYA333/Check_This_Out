import type { Language, LocalizationDictionary, MessageKey } from '../types.ts';
import { enDictionary } from './en.ts';
import { hiDictionary } from './hi.ts';
import { teDictionary } from './te.ts';

export const DICTIONARIES: Record<Language, LocalizationDictionary> = {
  en: enDictionary,
  hi: hiDictionary,
  te: teDictionary,
};

export function getDictionary(lang: Language): LocalizationDictionary {
  return DICTIONARIES[lang] ?? DICTIONARIES.en;
}

export function getMessage(lang: Language, key: MessageKey): string {
  const dict = getDictionary(lang);
  return dict[key] ?? DICTIONARIES.en[key] ?? '';
}
