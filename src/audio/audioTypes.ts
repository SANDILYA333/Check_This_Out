import type { Language, MessageKey } from '../localization/types.ts';

export type AudioPlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'fallback'
  | 'paused'
  | 'failed'
  | 'unavailable';

export interface AudioPlayResult {
  ok: boolean;
  language?: Language;
  messageKey?: MessageKey;
  fallback?: boolean;
  error?: string;
}

export type AudioStatusSubscriber = (status: AudioPlaybackStatus) => void;
