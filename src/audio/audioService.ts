import type { Language, MessageKey } from '../localization/types.ts';
import type { AudioPlaybackStatus, AudioPlayResult, AudioStatusSubscriber } from './audioTypes.ts';
import { resolveAudioUrl } from './audioAssetResolver.ts';
import { getMessage } from '../localization/index.ts';
import {
  type SpeechSynthesisLike,
  type SpeechSynthesisVoiceLike,
  type SpeechSynthesisUtteranceLike,
  getLanguageTag,
  findCompatibleVoice,
} from './speechFallback.ts';

export interface AudioElementFactory {
  (url: string): HTMLAudioElement;
}

export interface SpeechUtteranceFactory {
  (text: string): SpeechSynthesisUtteranceLike;
}

export class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtteranceLike | null = null;
  private currentLanguage: Language | null = null;
  private currentKey: MessageKey | null = null;
  private status: AudioPlaybackStatus = 'idle';
  private subscribers: Set<AudioStatusSubscriber> = new Set();
  private audioElementFactory: AudioElementFactory;
  private customSpeechSynthesis?: SpeechSynthesisLike;
  private customUtteranceFactory?: SpeechUtteranceFactory;
  private playRequestId: number = 0;

  constructor(
    customFactory?: AudioElementFactory,
    customSpeechSynthesis?: SpeechSynthesisLike,
    customUtteranceFactory?: SpeechUtteranceFactory
  ) {
    this.audioElementFactory =
      customFactory ??
      ((url: string) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        return audio;
      });
    this.customSpeechSynthesis = customSpeechSynthesis;
    this.customUtteranceFactory = customUtteranceFactory;
  }

  public getStatus(): AudioPlaybackStatus {
    return this.status;
  }

  public getCurrentPlayback(): { language: Language; messageKey: MessageKey } | null {
    if (this.currentLanguage && this.currentKey) {
      return { language: this.currentLanguage, messageKey: this.currentKey };
    }
    return null;
  }

  public subscribe(listener: AudioStatusSubscriber): () => void {
    this.subscribers.add(listener);
    listener(this.status);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private setStatus(newStatus: AudioPlaybackStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.subscribers) {
        try {
          listener(this.status);
        } catch (err) {
          console.error('Error in audio status subscriber:', err);
        }
      }
    }
  }

  private getSpeechSynthesis(): SpeechSynthesisLike | null {
    if (this.customSpeechSynthesis) {
      return this.customSpeechSynthesis;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis as unknown as SpeechSynthesisLike;
    }
    return null;
  }

  private createUtterance(text: string): SpeechSynthesisUtteranceLike | null {
    if (this.customUtteranceFactory) {
      return this.customUtteranceFactory(text);
    }
    if (typeof SpeechSynthesisUtterance !== 'undefined') {
      return new SpeechSynthesisUtterance(text) as unknown as SpeechSynthesisUtteranceLike;
    }
    return null;
  }

  public stop(): void {
    this.playRequestId++;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore errors during stop
      }
      this.currentAudio = null;
    }

    const synth = this.getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch {
        // Ignore speech cancel errors
      }
    }
    this.currentUtterance = null;
    this.currentLanguage = null;
    this.currentKey = null;
    this.setStatus('idle');
  }

  public async play(
    lang: Language,
    key: MessageKey,
    fallbackText?: string
  ): Promise<AudioPlayResult> {
    const requestId = ++this.playRequestId;

    // 1. Resolve audio asset URL
    const url = resolveAudioUrl(lang, key);

    // Stop any existing playback
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore cleanup errors
      }
      this.currentAudio = null;
    }
    const synth = this.getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch {
        // Ignore speech cancel errors
      }
    }
    this.currentUtterance = null;

    // 2. If a prerecorded MP3 exists, attempt to play it
    if (url) {
      this.currentLanguage = lang;
      this.currentKey = key;
      this.setStatus('loading');

      try {
        const audio = this.audioElementFactory(url);

        audio.onended = () => {
          if (this.playRequestId === requestId) {
            this.currentAudio = null;
            this.currentLanguage = null;
            this.currentKey = null;
            this.setStatus('idle');
          }
        };

        audio.onerror = () => {
          if (this.playRequestId === requestId) {
            this.currentAudio = null;
            // On asset load error, attempt speech synthesis fallback if synth is available
            const synth = this.getSpeechSynthesis();
            if (synth) {
              this.playSpeechFallback(lang, key, fallbackText, requestId);
            } else {
              this.setStatus('failed');
            }
          }
        };

        this.currentAudio = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        if (this.playRequestId !== requestId) {
          try {
            audio.pause();
          } catch {
            // Ignore
          }
          return { ok: false, language: lang, messageKey: key, error: 'Playback interrupted.' };
        }

        this.setStatus('playing');
        return { ok: true, language: lang, messageKey: key };
      } catch (err: any) {
        // Playback promise rejected (e.g. autoplay restriction or missing file)
        if (this.playRequestId === requestId) {
          this.currentAudio = null;
          const synth = this.getSpeechSynthesis();
          if (synth) {
            return this.playSpeechFallback(lang, key, fallbackText, requestId);
          }
          this.setStatus('failed');
        }
        return {
          ok: false,
          language: lang,
          messageKey: key,
          error: err?.message || 'Audio playback rejected.',
        };
      }
    }

    // 3. No prerecorded MP3 exists: trigger browser speech synthesis fallback
    return this.playSpeechFallback(lang, key, fallbackText, requestId);
  }

  private playSpeechFallback(
    lang: Language,
    key: MessageKey,
    fallbackText: string | undefined,
    requestId: number
  ): AudioPlayResult {
    const synth = this.getSpeechSynthesis();
    if (!synth) {
      this.currentLanguage = null;
      this.currentKey = null;
      this.setStatus('unavailable');
      return {
        ok: false,
        language: lang,
        messageKey: key,
        error: `No audio asset available for key "${key}" in language "${lang}" and browser speech synthesis is unavailable.`,
      };
    }

    const textToSpeak = fallbackText ?? getMessage(lang, key);
    if (!textToSpeak) {
      this.currentLanguage = null;
      this.currentKey = null;
      this.setStatus('unavailable');
      return {
        ok: false,
        language: lang,
        messageKey: key,
        error: `No instruction text available for key "${key}".`,
      };
    }

    // Voice compatibility check
    const voices = synth.getVoices ? synth.getVoices() : [];
    const compatibleVoice = findCompatibleVoice(voices, lang);

    // If device reports installed voices but none support requested language
    if (voices.length > 0 && !compatibleVoice) {
      this.currentLanguage = null;
      this.currentKey = null;
      this.setStatus('unavailable');
      return {
        ok: false,
        language: lang,
        messageKey: key,
        error: `No compatible voice installed on this device for language "${lang}".`,
      };
    }

    const utterance = this.createUtterance(textToSpeak);
    if (!utterance) {
      this.currentLanguage = null;
      this.currentKey = null;
      this.setStatus('unavailable');
      return {
        ok: false,
        language: lang,
        messageKey: key,
        error: 'Unable to instantiate speech utterance.',
      };
    }

    utterance.lang = getLanguageTag(lang);
    if (compatibleVoice) {
      utterance.voice = compatibleVoice;
    }

    utterance.onstart = () => {
      if (this.playRequestId === requestId) {
        this.setStatus('fallback');
      }
    };

    utterance.onend = () => {
      if (this.playRequestId === requestId) {
        this.currentUtterance = null;
        this.currentLanguage = null;
        this.currentKey = null;
        this.setStatus('idle');
      }
    };

    utterance.onerror = (e) => {
      if (this.playRequestId === requestId) {
        this.currentUtterance = null;
        this.setStatus('failed');
      }
    };

    this.currentUtterance = utterance;
    this.currentLanguage = lang;
    this.currentKey = key;
    this.setStatus('fallback');

    try {
      synth.cancel();
      synth.speak(utterance);
      return { ok: true, language: lang, messageKey: key, fallback: true };
    } catch (err: any) {
      if (this.playRequestId === requestId) {
        this.currentUtterance = null;
        this.setStatus('failed');
      }
      return {
        ok: false,
        language: lang,
        messageKey: key,
        error: err?.message || 'Speech synthesis failed.',
      };
    }
  }

  public destroy(): void {
    this.stop();
    this.subscribers.clear();
  }
}

// Global default audio service instance
export const audioService = new AudioService();
