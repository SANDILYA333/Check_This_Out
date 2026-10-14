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

export function hasAudioAsset(key: MessageKey): boolean {
  return AUDIO_ASSET_KEYS.has(key);
}

/**
 * Resolves the URL for a bundled MP3 audio asset.
 * If running inside a Chrome extension with chrome.runtime.getURL available,
 * it returns the chrome-extension:// URL. Otherwise, it returns a root-relative path.
 */
export function resolveAudioUrl(lang: Language, key: MessageKey): string | null {
  if (!hasAudioAsset(key)) {
    return null;
  }

  const relativePath = `audio/${lang}/${key}.mp3`;

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
