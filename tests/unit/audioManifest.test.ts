import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_ASSET_KEYS,
  hasAudioAsset,
  resolveAudioUrl,
} from '../../src/audio/audioAssetResolver.ts';
import type { Language, MessageKey } from '../../src/localization/types.ts';

test('Audio Manifest — Asset Existence, Naming Conventions, and URL Resolution', async (t) => {
  const supportedLanguages: readonly Language[] = ['en', 'hi', 'te'] as const;
  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio');

  await t.test('All bundled prerecorded MP3 assets exist on disk and are non-empty', () => {
    assert.ok(fs.existsSync(publicAudioDir), 'public/audio directory must exist');

    for (const lang of supportedLanguages) {
      const langDir = path.join(publicAudioDir, lang);
      assert.ok(fs.existsSync(langDir), `public/audio/${lang} directory must exist`);

      for (const key of AUDIO_ASSET_KEYS) {
        const filePath = path.join(langDir, `${key}.mp3`);
        assert.ok(
          fs.existsSync(filePath),
          `MP3 file must exist: public/audio/${lang}/${key}.mp3`
        );
        const stat = fs.statSync(filePath);
        assert.ok(
          stat.size > 1000,
          `MP3 file public/audio/${lang}/${key}.mp3 must be non-empty (got ${stat.size} bytes)`
        );
      }
    }
  });

  await t.test('hasAudioAsset returns true for valid audio keys and false otherwise', () => {
    assert.strictEqual(hasAudioAsset('welcome_instruction'), true);
    assert.strictEqual(hasAudioAsset('upi_safety_warning'), true);
    assert.strictEqual(hasAudioAsset('order_total_spoken'), true);
    assert.strictEqual(hasAudioAsset('lang_name_te'), true);
    assert.strictEqual(hasAudioAsset('lang_name_hi'), true);
    assert.strictEqual(hasAudioAsset('lang_name_en'), true);

    // Non-audio keys
    assert.strictEqual(hasAudioAsset('assistant_title' as MessageKey), false);
    assert.strictEqual(hasAudioAsset('confirm_button' as MessageKey), false);
  });

  await t.test('resolveAudioUrl returns relative path fallback in non-extension environments', () => {
    const url = resolveAudioUrl('en', 'welcome_instruction');
    assert.strictEqual(url, '/audio/en/welcome_instruction.mp3');

    const teUrl = resolveAudioUrl('te', 'upi_safety_warning');
    assert.strictEqual(teUrl, '/audio/te/upi_safety_warning.mp3');

    const missing = resolveAudioUrl('en', 'assistant_title' as MessageKey);
    assert.strictEqual(missing, null);
  });

  await t.test('resolveAudioUrl uses chrome.runtime.getURL when running in Chrome extension', () => {
    const originalChrome = (globalThis as any).chrome;
    try {
      (globalThis as any).chrome = {
        runtime: {
          getURL: (p: string) => `chrome-extension://test-extension-id/${p}`,
        },
      };

      const url = resolveAudioUrl('hi', 'welcome_instruction');
      assert.strictEqual(
        url,
        'chrome-extension://test-extension-id/audio/hi/welcome_instruction.mp3'
      );
    } finally {
      (globalThis as any).chrome = originalChrome;
    }
  });
});
