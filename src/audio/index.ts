export type { AudioPlaybackStatus, AudioPlayResult, AudioStatusSubscriber } from './audioTypes.ts';
export { resolveAudioUrl, hasAudioAsset, AUDIO_ASSET_KEYS } from './audioAssetResolver.ts';
export { AudioService, audioService, type AudioElementFactory, type SpeechUtteranceFactory } from './audioService.ts';
export {
  getLanguageTag,
  findCompatibleVoice,
  type SpeechSynthesisLike,
  type SpeechSynthesisVoiceLike,
  type SpeechSynthesisUtteranceLike,
} from './speechFallback.ts';
