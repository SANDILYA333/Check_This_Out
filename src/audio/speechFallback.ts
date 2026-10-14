import type { Language } from '../localization/types.ts';

export interface SpeechSynthesisVoiceLike {
  name: string;
  lang: string;
  default?: boolean;
}

export interface SpeechSynthesisUtteranceLike {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoiceLike | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: any) => void) | null;
}

export interface SpeechSynthesisLike {
  speaking: boolean;
  paused: boolean;
  getVoices(): SpeechSynthesisVoiceLike[];
  speak(utterance: any): void;
  cancel(): void;
  pause?(): void;
  resume?(): void;
}

/**
 * Maps our supported Language codes to standardized BCP-47 language tags.
 * Prefers Indian regional voice variants (en-IN, hi-IN, te-IN).
 */
export function getLanguageTag(lang: Language): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN';
    case 'te':
      return 'te-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

/**
 * Searches the available voices for a voice compatible with the requested language.
 *
 * Matching Priority:
 * 1. Exact match for regional variant (e.g. 'en-in', 'hi-in', 'te-in')
 * 2. Starts with regional tag (e.g. 'en-in-...')
 * 3. General language prefix match (e.g. 'en', 'hi', 'te')
 *
 * Safety Invariant:
 * If the device has voices installed (voices.length > 0) but NONE match the requested language,
 * returns null. Never speaks a language using an incompatible voice.
 */
export function findCompatibleVoice(
  voices: SpeechSynthesisVoiceLike[],
  lang: Language
): SpeechSynthesisVoiceLike | null {
  if (!voices || voices.length === 0) {
    return null;
  }

  const primaryTag = getLanguageTag(lang).toLowerCase();
  const prefix = lang.toLowerCase();

  // 1. Exact regional match
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === primaryTag);
  if (exact) return exact;

  // 2. Regional prefix match
  const regionalPrefix = voices.find((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith(primaryTag)
  );
  if (regionalPrefix) return regionalPrefix;

  // 3. General language prefix match (e.g. 'en', 'hi', 'te')
  const generalMatch = voices.find((v) => {
    const vLang = v.lang.toLowerCase().replace('_', '-');
    return vLang === prefix || vLang.startsWith(prefix + '-');
  });
  if (generalMatch) return generalMatch;

  return null;
}
