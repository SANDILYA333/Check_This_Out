import type { Language, MessageKey } from '../localization/types.ts';

/**
 * Message keys that have corresponding bundled prerecorded MP3 assets.
 */
export const AUDIO_ASSET_KEYS: ReadonlySet<MessageKey> = new Set<MessageKey>([
  'welcome_instruction',
  'language_instruction',
  'address_instruction',
  'address_change_instruction',
  'method_instruction',
  'review_instruction',
  'upi_simulation_instruction',
  'processing_instruction',
  'success_instruction',
  'failed_instruction',
  'pending_instruction',
  'retry_instruction',
  'upi_safety_warning',
  'order_total_spoken',
  'lang_name_te',
  'lang_name_hi',
  'lang_name_en',
  'audio_unavailable',
  'audio_playback_failed',
  'unsupported_page',
]);

export const AUDIO_KEY_ALIASES: Partial<Record<MessageKey, MessageKey>> = {
  shopsphere_landing_instruction: 'welcome_instruction',
  shopsphere_address_instruction: 'address_instruction',
  shopsphere_payment_instruction: 'method_instruction',
  shopsphere_review_instruction: 'review_instruction',
  shopsphere_demo_payment_instruction: 'upi_simulation_instruction',
  shopsphere_confirmed_instruction: 'success_instruction',
  shopsphere_failed_instruction: 'failed_instruction',
  shopsphere_pending_instruction: 'pending_instruction',
};

export function hasAudioAsset(key: MessageKey): boolean {
  const resolvedKey = AUDIO_KEY_ALIASES[key] ?? key;
  return AUDIO_ASSET_KEYS.has(resolvedKey);
}

/**
 * Resolves the URL for a bundled MP3 audio asset.
 * If running inside a Chrome extension with chrome.runtime.getURL available,
 * it returns the chrome-extension:// URL. Otherwise, it returns a root-relative path.
 */
export function resolveAudioUrl(lang: Language, key: MessageKey): string | null {
  const resolvedKey = AUDIO_KEY_ALIASES[key] ?? key;
  if (!hasAudioAsset(resolvedKey)) {
    return null;
  }

  const relativePath = `audio/${lang}/${resolvedKey}.mp3`;

  // Chrome Extension Manifest V3 environment
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === 'function'
  ) {
    try {
      return chrome.runtime.getURL(relativePath);
    } catch {
      // Fallback to relative path if chrome.runtime fails
    }
  }

  // Web/Demo or test fallback
  return `/${relativePath}`;
}

