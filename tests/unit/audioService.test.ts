import test from 'node:test';
import assert from 'node:assert';
import { AudioService } from '../../src/audio/audioService.ts';
import type { AudioPlaybackStatus } from '../../src/audio/audioTypes.ts';

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

test('Audio Service — Playback Lifecycle, Concurrency, and Error Resilience', async (t) => {
  await t.test('Plays valid audio asset and tracks status', async () => {
    let createdAudio: MockAudioElement | null = null;
    const service = new AudioService((url) => {
      createdAudio = new MockAudioElement(url);
      return createdAudio as unknown as HTMLAudioElement;
    });

    const statusHistory: AudioPlaybackStatus[] = [];
    service.subscribe((s) => statusHistory.push(s));

    const result = await service.play('en', 'welcome_instruction');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(service.getStatus(), 'playing');
    assert.ok(createdAudio);
    assert.strictEqual((createdAudio as MockAudioElement).paused, false);

    // Trigger track completion
    createdAudio!.onended!();
    assert.strictEqual(service.getStatus(), 'idle');

    service.destroy();
  });

  await t.test('stop() immediately pauses audio and resets state to idle', async () => {
    let createdAudio: MockAudioElement | null = null;
    const service = new AudioService((url) => {
      createdAudio = new MockAudioElement(url);
      return createdAudio as unknown as HTMLAudioElement;
    });

    await service.play('te', 'welcome_instruction');
    assert.strictEqual(service.getStatus(), 'playing');

    service.stop();
    assert.strictEqual(service.getStatus(), 'idle');
    assert.strictEqual(createdAudio!.paused, true);
    assert.strictEqual(createdAudio!.currentTime, 0);

    service.destroy();
  });

  await t.test('Handles missing audio asset safely with "unavailable" status', async () => {
    const service = new AudioService((url) => new MockAudioElement(url) as unknown as HTMLAudioElement);

    const result = await service.play('en', 'assistant_title' as any);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(service.getStatus(), 'unavailable');
    assert.ok(result.error?.includes('No audio asset available'));

    service.destroy();
  });

  await t.test('Handles rejected play() promise safely with "failed" status', async () => {
    const service = new AudioService((url) => {
      return new MockAudioElement(url, true) as unknown as HTMLAudioElement;
    });

    const result = await service.play('hi', 'welcome_instruction');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(service.getStatus(), 'failed');
    assert.ok(result.error?.includes('Autoplay blocked'));

    service.destroy();
  });

  await t.test('Successive play calls interrupt previous audio without concurrent overlapping', async () => {
    const createdAudios: MockAudioElement[] = [];
    const service = new AudioService((url) => {
      const a = new MockAudioElement(url);
      createdAudios.push(a);
      return a as unknown as HTMLAudioElement;
    });

    // Start track 1
    await service.play('en', 'welcome_instruction');
    assert.strictEqual(createdAudios.length, 1);
    assert.strictEqual(createdAudios[0].paused, false);

    // Start track 2 immediately
    await service.play('te', 'upi_safety_warning');
    assert.strictEqual(createdAudios.length, 2);
    // Track 1 must be paused
    assert.strictEqual(createdAudios[0].paused, true);
    // Track 2 must be playing
    assert.strictEqual(createdAudios[1].paused, false);
    assert.strictEqual(service.getStatus(), 'playing');

    service.destroy();
  });
});
