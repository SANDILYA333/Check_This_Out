import test from 'node:test';
import assert from 'node:assert';
import { AudioService } from '../../src/audio/audioService.ts';
import type { AudioPlaybackStatus } from '../../src/audio/audioTypes.ts';
import {
  findCompatibleVoice,
  getLanguageTag,
  type SpeechSynthesisLike,
  type SpeechSynthesisVoiceLike,
  type SpeechSynthesisUtteranceLike,
} from '../../src/audio/speechFallback.ts';
import { getMessage } from '../../src/localization/index.ts';

class MockAudioElement {
  public src: string;
  public preload: string = 'auto';
  public currentTime: number = 0;
  public paused: boolean = true;
  public onended: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  private shouldFail: boolean = false;

  constructor(src: string, shouldFail: boolean = false) {
    this.src = src;
    this.shouldFail = shouldFail;
  }

  play(): Promise<void> {
    this.paused = false;
    if (this.shouldFail) {
      return Promise.reject(new Error('Autoplay blocked'));
    }
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

class MockUtterance implements SpeechSynthesisUtteranceLike {
  public text: string;
  public lang: string = '';
  public voice: SpeechSynthesisVoiceLike | null = null;
  public onstart: (() => void) | null = null;
  public onend: (() => void) | null = null;
  public onerror: ((event?: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis implements SpeechSynthesisLike {
  public speaking: boolean = false;
  public paused: boolean = false;
  public spokenUtterances: MockUtterance[] = [];
  public cancelledCount: number = 0;
  private voices: SpeechSynthesisVoiceLike[];
  public shouldFail: boolean = false;

  constructor(voices: SpeechSynthesisVoiceLike[] = [], shouldFail: boolean = false) {
    this.voices = voices;
    this.shouldFail = shouldFail;
  }

  getVoices(): SpeechSynthesisVoiceLike[] {
    return this.voices;
  }

  speak(utterance: MockUtterance): void {
    this.speaking = true;
    this.spokenUtterances.push(utterance);
    if (this.shouldFail) {
      this.speaking = false;
      if (utterance.onerror) {
        utterance.onerror(new Error('Speech synth error'));
      }
      return;
    }
    if (utterance.onstart) {
      utterance.onstart();
    }
  }

  cancel(): void {
    this.speaking = false;
    this.cancelledCount++;
  }
}

const standardIndianVoices: SpeechSynthesisVoiceLike[] = [
  { name: 'Google English (India)', lang: 'en-IN', default: true },
  { name: 'Google हिन्दी', lang: 'hi-IN' },
  { name: 'Google తెలుగు', lang: 'te-IN' },
];

test('Speech Fallback — Voice Matching and Language Tags', async (t) => {
  await t.test('Language tags map to Indian English, Hindi, and Telugu tags', () => {
    assert.strictEqual(getLanguageTag('en'), 'en-IN');
    assert.strictEqual(getLanguageTag('hi'), 'hi-IN');
    assert.strictEqual(getLanguageTag('te'), 'te-IN');
  });

  await t.test('Finds exact and prefix regional voice matches', () => {
    const enVoice = findCompatibleVoice(standardIndianVoices, 'en');
    assert.ok(enVoice);
    assert.strictEqual(enVoice.lang, 'en-IN');

    const hiVoice = findCompatibleVoice(standardIndianVoices, 'hi');
    assert.ok(hiVoice);
    assert.strictEqual(hiVoice.lang, 'hi-IN');

    const teVoice = findCompatibleVoice(standardIndianVoices, 'te');
    assert.ok(teVoice);
    assert.strictEqual(teVoice.lang, 'te-IN');
  });

  await t.test('Returns null when device has voices installed but none match the requested language', () => {
    const englishOnlyVoices: SpeechSynthesisVoiceLike[] = [
      { name: 'English US', lang: 'en-US' },
      { name: 'English UK', lang: 'en-GB' },
    ];

    // Telugu and Hindi must return null instead of using incompatible English voice
    assert.strictEqual(findCompatibleVoice(englishOnlyVoices, 'te'), null);
    assert.strictEqual(findCompatibleVoice(englishOnlyVoices, 'hi'), null);
    // English matches
    assert.ok(findCompatibleVoice(englishOnlyVoices, 'en'));
  });

  await t.test('Returns null when voice list is empty', () => {
    assert.strictEqual(findCompatibleVoice([], 'en'), null);
  });
});

test('Audio Service — Browser Speech Synthesis Fallback Integration', async (t) => {
  await t.test('Requirement 1: Existing MP3 playback succeeds without triggering fallback', async () => {
    let mockAudio: MockAudioElement | null = null;
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);

    const service = new AudioService(
      (url) => {
        mockAudio = new MockAudioElement(url);
        return mockAudio as unknown as HTMLAudioElement;
      },
      mockSynth,
      (text) => new MockUtterance(text)
    );

    // welcome_instruction has a bundled MP3
    const result = await service.play('en', 'welcome_instruction');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.fallback, undefined);
    assert.strictEqual(service.getStatus(), 'playing');
    assert.strictEqual(mockSynth.spokenUtterances.length, 0);
    assert.ok(mockAudio);

    service.destroy();
  });

  await t.test('Requirement 2: Missing MP3 triggers speech synthesis fallback', async () => {
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);

    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      mockSynth,
      (text) => new MockUtterance(text)
    );

    // amazon_cart_instruction has no MP3 file; must fallback
    const result = await service.play('en', 'amazon_cart_instruction');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.fallback, true);
    assert.strictEqual(service.getStatus(), 'fallback');
    assert.strictEqual(mockSynth.spokenUtterances.length, 1);
    assert.strictEqual(mockSynth.spokenUtterances[0].text, getMessage('en', 'amazon_cart_instruction'));
    assert.strictEqual(mockSynth.spokenUtterances[0].lang, 'en-IN');

    service.destroy();
  });

  await t.test('Requirement 3: Asset-loading error (audio.onerror) triggers speech fallback', async () => {
    let mockAudio: MockAudioElement | null = null;
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);

    const service = new AudioService(
      (url) => {
        mockAudio = new MockAudioElement(url);
        return mockAudio as unknown as HTMLAudioElement;
      },
      mockSynth,
      (text) => new MockUtterance(text)
    );

    await service.play('en', 'welcome_instruction');
    assert.ok(mockAudio);

    // Simulate 404 or corrupt file error on HTMLAudioElement
    (mockAudio as MockAudioElement).onerror!();

    // Fallback must be engaged
    assert.strictEqual(service.getStatus(), 'fallback');
    assert.strictEqual(mockSynth.spokenUtterances.length, 1);
    assert.strictEqual(mockSynth.spokenUtterances[0].text, getMessage('en', 'welcome_instruction'));

    service.destroy();
  });

  await t.test('Requirement 4: Playback rejection (autoplay blocked) triggers speech fallback when synth available', async () => {
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);

    const service = new AudioService(
      (url) => new MockAudioElement(url, true) as unknown as HTMLAudioElement, // shouldFail = true
      mockSynth,
      (text) => new MockUtterance(text)
    );

    const result = await service.play('en', 'welcome_instruction');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.fallback, true);
    assert.strictEqual(service.getStatus(), 'fallback');
    assert.strictEqual(mockSynth.spokenUtterances.length, 1);

    service.destroy();
  });

  await t.test('Requirement 5: Browser speech synthesis unavailable reports "unavailable"', async () => {
    // No speechSynthesis available
    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      undefined // No synth
    );

    const result = await service.play('en', 'amazon_cart_instruction');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(service.getStatus(), 'unavailable');
    assert.ok(result.error?.includes('browser speech synthesis is unavailable'));

    service.destroy();
  });

  await t.test('Requirement 6: No suitable browser voice exists reports "unavailable" without mangling speech', async () => {
    const englishOnlyVoices: SpeechSynthesisVoiceLike[] = [
      { name: 'English US', lang: 'en-US' },
    ];
    const mockSynth = new MockSpeechSynthesis(englishOnlyVoices);

    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      mockSynth,
      (text) => new MockUtterance(text)
    );

    // Requesting Telugu guidance when only English voice is installed must safely refuse
    const result = await service.play('te', 'amazon_cart_instruction');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(service.getStatus(), 'unavailable');
    assert.ok(result.error?.includes('No compatible voice installed on this device'));
    assert.strictEqual(mockSynth.spokenUtterances.length, 0);

    service.destroy();
  });

  await t.test('Requirement 7, 8, 9: Multilingual speech synthesis (English, Hindi, Telugu)', async () => {
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);
    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      mockSynth,
      (text) => new MockUtterance(text)
    );

    // English
    await service.play('en', 'amazon_address_instruction');
    assert.strictEqual(mockSynth.spokenUtterances[0].lang, 'en-IN');
    assert.strictEqual(mockSynth.spokenUtterances[0].text, getMessage('en', 'amazon_address_instruction'));

    // Hindi
    await service.play('hi', 'amazon_address_instruction');
    assert.strictEqual(mockSynth.spokenUtterances[1].lang, 'hi-IN');
    assert.strictEqual(mockSynth.spokenUtterances[1].text, getMessage('hi', 'amazon_address_instruction'));

    // Telugu
    await service.play('te', 'amazon_address_instruction');
    assert.strictEqual(mockSynth.spokenUtterances[2].lang, 'te-IN');
    assert.strictEqual(mockSynth.spokenUtterances[2].text, getMessage('te', 'amazon_address_instruction'));

    service.destroy();
  });

  await t.test('Requirement 10 & 13: Language switching and repeated clicks cancel previous speech without overlap', async () => {
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);
    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      mockSynth,
      (text) => new MockUtterance(text)
    );

    // Play English
    await service.play('en', 'amazon_cart_instruction');
    const initialCancels = mockSynth.cancelledCount;

    // Switch to Hindi immediately
    await service.play('hi', 'amazon_cart_instruction');
    assert.ok(mockSynth.cancelledCount > initialCancels, 'Must cancel previous speech before starting new language');

    // Rapid successive replay
    await service.play('hi', 'amazon_cart_instruction');
    assert.ok(mockSynth.cancelledCount > initialCancels + 1, 'Must cancel previous speech on rapid replay');

    service.destroy();
  });

  await t.test('Requirement 11 & 12: stop() and component unmount clean up speech synthesis', async () => {
    const mockSynth = new MockSpeechSynthesis(standardIndianVoices);
    const service = new AudioService(
      (url) => new MockAudioElement(url) as unknown as HTMLAudioElement,
      mockSynth,
      (text) => new MockUtterance(text)
    );

    await service.play('en', 'amazon_cart_instruction');
    assert.strictEqual(service.getStatus(), 'fallback');

    // Simulate user clicking Stop Audio or unmounting assistant
    service.stop();
    assert.strictEqual(service.getStatus(), 'idle');
    assert.strictEqual(mockSynth.speaking, false);

    service.destroy();
  });

  await t.test('Requirement 14: Visible instructions remain available when all audio fails', () => {
    // Test that localized strings are completely defined regardless of audio state
    const amazonKeys = [
      'amazon_cart_instruction',
      'amazon_address_instruction',
      'amazon_payment_instruction',
      'amazon_review_instruction',
      'amazon_empty_cart_instruction',
      'amazon_auth_instruction',
      'amazon_challenge_instruction',
      'amazon_waiting_update',
      'amazon_unverified_instruction',
      'amazon_outcome_confirmed',
      'amazon_outcome_unconfirmed',
      'amazon_outcome_pending',
      'amazon_outcome_failed',
    ] as const;

    for (const key of amazonKeys) {
      assert.ok(getMessage('en', key).length > 0);
      assert.ok(getMessage('hi', key).length > 0);
      assert.ok(getMessage('te', key).length > 0);
    }
  });

  await t.test('Requirement 15: Existing demo audio assets remain intact and functional', async () => {
    const demoKeys = [
      'welcome_instruction',
      'language_instruction',
      'address_instruction',
      'method_instruction',
      'review_instruction',
      'upi_simulation_instruction',
      'processing_instruction',
      'success_instruction',
      'failed_instruction',
      'pending_instruction',
    ] as const;

    let playedCount = 0;
    const service = new AudioService(
      (url) => {
        playedCount++;
        return new MockAudioElement(url) as unknown as HTMLAudioElement;
      }
    );

    for (const key of demoKeys) {
      const res = await service.play('en', key);
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.fallback, undefined); // Real MP3 played, no fallback
    }

    assert.strictEqual(playedCount, demoKeys.length);
    service.destroy();
  });
});
