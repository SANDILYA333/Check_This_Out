import React, { useEffect, useState, useRef } from 'react';
import type { Language } from '../../guidance/types.ts';
import type {
  AmazonGuidanceController,
  AmazonGuidanceIntent,
  AmazonGuidanceState,
} from './amazonGuidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import type { TargetLookupResult } from '../targets/targetRegistry.ts';
import { getMessage, type MessageKey } from '../../localization/index.ts';
import { audioService, type AudioPlaybackStatus } from '../../audio/index.ts';

export interface AmazonAssistantAppProps {
  controller: AmazonGuidanceController;
  highlighter: TargetHighlighter;
  onClose: () => void;
}

const h = React.createElement;

function getAmazonInstructionKey(intent: AmazonGuidanceIntent): MessageKey {
  switch (intent) {
    case 'GUIDE_CART':
      return 'amazon_cart_instruction';
    case 'GUIDE_ADDRESS_SELECTION':
      return 'amazon_address_instruction';
    case 'GUIDE_PAYMENT_SELECTION':
      return 'amazon_payment_instruction';
    case 'GUIDE_ORDER_REVIEW':
      return 'amazon_review_instruction';
    case 'PAUSED_EMPTY_CART':
      return 'amazon_empty_cart_instruction';
    case 'PAUSED_AUTH_REQUIRED':
      return 'amazon_auth_instruction';
    case 'PAUSED_SECURITY_CHALLENGE':
      return 'amazon_challenge_instruction';
    case 'PAUSED_UNVERIFIED':
      return 'amazon_unverified_instruction';
    case 'OUTCOME_CONFIRMED':
      return 'amazon_outcome_confirmed';
    case 'OUTCOME_UNCONFIRMED':
      return 'amazon_outcome_unconfirmed';
    case 'OUTCOME_PENDING':
      return 'amazon_outcome_pending';
    case 'OUTCOME_FAILED':
      return 'amazon_outcome_failed';
    case 'PAUSED_UNSUPPORTED':
    default:
      return 'unsupported_page';
  }
}

export const AmazonAssistantApp: React.FC<AmazonAssistantAppProps> = ({
  controller,
  highlighter,
  onClose,
}) => {
  const [state, setState] = useState<AmazonGuidanceState>(controller.getState());
  const [targetStatus, setTargetStatus] = useState<TargetLookupResult['status'] | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackStatus>(audioService.getStatus());
  const [audioNotice, setAudioNotice] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const doc = typeof document !== 'undefined' ? document : null;
    const initialRes = doc ? highlighter.update(state.targetId, doc) : null;
    if (initialRes) {
      setTargetStatus(initialRes.status);
    } else {
      setTargetStatus(null);
    }

    // Subscribe to guidance state changes
    const unsubscribeState = controller.subscribe((newState) => {
      setState(newState);
      const updateRes = doc ? highlighter.update(newState.targetId, doc) : null;
      if (updateRes) {
        setTargetStatus(updateRes.status);
      } else {
        setTargetStatus(null);
      }
    });

    // Subscribe to audio playback status updates
    const unsubscribeAudio = audioService.subscribe((status) => {
      setAudioStatus(status);
      if (status === 'playing') {
        setAudioNotice('Playing audio...');
      } else if (status === 'loading') {
        setAudioNotice('Loading audio...');
      } else if (status === 'fallback') {
        setAudioNotice('Using browser speech...');
      } else if (status === 'failed') {
        setAudioNotice('Audio playback failed.');
      } else if (status === 'unavailable') {
        setAudioNotice('Audio unavailable for this prompt.');
      } else if (status === 'idle') {
        setAudioNotice('');
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeAudio();
      audioService.stop();
    };
  }, [controller, highlighter]);

  const instructionKey = getAmazonInstructionKey(state.intent);
  const instructionText = state.isWaitingForPageUpdate
    ? getMessage(state.language, 'amazon_waiting_update')
    : getMessage(state.language, instructionKey);

  const handleLanguageChange = (lang: Language) => {
    audioService.stop();
    controller.setLanguage(lang);
  };

  const handlePlayLanguageName = (lang: Language) => {
    const key = `lang_name_${lang}` as MessageKey;
    audioService.play(lang, key);
  };

  const handleReplayAudio = async () => {
    if (audioStatus === 'playing' || audioStatus === 'fallback') {
      audioService.stop();
    } else {
      const activeKey = state.isWaitingForPageUpdate ? 'amazon_waiting_update' : instructionKey;
      await audioService.play(state.language, activeKey, instructionText);
    }
  };

  const handleClose = () => {
    audioService.stop();
    onClose();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) {
      return;
    }
    const currentElem = panelRef.current;
    if (!currentElem) return;
    const rect = currentElem.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      moved: false,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !panelRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragRef.current.moved = true;
    }
    const newX = dragRef.current.initX + deltaX;
    const newY = dragRef.current.initY + deltaY;
    const elemWidth = panelRef.current.offsetWidth || 360;
    const elemHeight = panelRef.current.offsetHeight || 200;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 768;
    const clampedX = Math.max(8, Math.min(newX, winW - elemWidth - 8));
    const clampedY = Math.max(8, Math.min(newY, winH - elemHeight - 8));
    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
  };

  // Minimized floating pill view
  if (isMinimized) {
    return h(
      'div',
      {
        ref: panelRef,
        className: 'assistant-minimized-pill',
        role: 'region',
        'aria-label': 'VoiceCheckout Minimized Assistant',
        style: position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: 'auto',
              bottom: 'auto',
            }
          : undefined,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onClick: () => {
          if (dragRef.current?.moved) return;
          setIsMinimized(false);
        },
        title: 'Click to expand VoiceCheckout — Drag to move',
      },
      h(
        'div',
        { className: 'minimized-brand' },
        h('span', { 'aria-hidden': 'true' }, '🎙️'),
        h('span', null, getMessage(state.language, 'assistant_title'))
      ),
      state.stepNumber && state.totalSteps
        ? h(
            'span',
            { className: 'minimized-step' },
            `Step ${state.stepNumber}/${state.totalSteps}`
          )
        : null,
      h(
        'button',
        {
          className: 'minimized-btn',
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsMinimized(false);
          },
          'aria-label': getMessage(state.language, 'expand_assistance'),
          title: getMessage(state.language, 'expand_assistance'),
        },
        '⤢'
      ),
      h(
        'button',
        {
          className: 'minimized-btn',
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            handleClose();
          },
          'aria-label': getMessage(state.language, 'close_assistance'),
          title: getMessage(state.language, 'close_assistance'),
        },
        '✕'
      )
    );
  }

  // Full panel view
  return h(
    'div',
    {
      ref: panelRef,
      className: 'assistant-panel',
      role: 'region',
      'aria-label': 'VoiceCheckout Amazon Assistant',
      style: position
        ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto',
          }
        : undefined,
    },
    // Header
    h(
      'div',
      {
        className: 'assistant-header',
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        title: 'Drag to move VoiceCheckout',
      },
      h(
        'div',
        { className: 'assistant-brand' },
        h('span', { 'aria-hidden': 'true' }, '🎙️'),
        h('span', null, `${getMessage(state.language, 'assistant_title')} — Amazon`)
      ),
      h(
        'div',
        { className: 'assistant-actions' },
        h(
          'button',
          {
            className: 'assistant-header-btn assistant-minimize-btn',
            onClick: () => setIsMinimized(true),
            'aria-label': getMessage(state.language, 'minimize_assistance'),
            title: getMessage(state.language, 'minimize_assistance'),
          },
          '−'
        ),
        h(
          'button',
          {
            className: 'assistant-header-btn assistant-close-btn',
            onClick: handleClose,
            'aria-label': getMessage(state.language, 'close_assistance'),
            title: getMessage(state.language, 'close_assistance'),
          },
          '✕'
        )
      )
    ),
    // Body
    h(
      'div',
      { className: 'assistant-body' },
      // Step badge for active checkout steps
      state.stepNumber && state.totalSteps
        ? h(
            'div',
            {
              className: 'step-badge',
              'aria-label': `Step ${state.stepNumber} of ${state.totalSteps}`,
            },
            `Step ${state.stepNumber} of ${state.totalSteps}`
          )
        : null,
      // Stage title
      h('h2', { className: 'stage-title' }, getMessage(state.language, 'assistant_title')),
      // Stage instruction
      h('p', { className: 'stage-instruction' }, instructionText),

      // Outcome banner for terminal or intermediate outcome states
      state.intent === 'OUTCOME_CONFIRMED'
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'status',
              'data-testid': 'amazon-outcome-confirmed-banner',
              style: { backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', fontWeight: 'bold' },
            },
            '✅ Order Confirmed on Amazon'
          )
        : null,

      state.intent === 'OUTCOME_UNCONFIRMED'
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'alert',
              'data-testid': 'amazon-outcome-unconfirmed-banner',
              style: { backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a' },
            },
            '⚠️ Order Unconfirmed'
          )
        : null,

      state.intent === 'OUTCOME_PENDING'
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'status',
              'data-testid': 'amazon-outcome-pending-banner',
              style: { backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' },
            },
            '⏳ Payment / Order Processing'
          )
        : null,

      state.intent === 'OUTCOME_FAILED'
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'alert',
              'data-testid': 'amazon-outcome-failed-banner',
              style: { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', fontWeight: 'bold' },
            },
            '❌ Order Failed / Payment Declined'
          )
        : null,

      // Waiting status indicator when user has clicked a verified control
      state.isWaitingForPageUpdate
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'status',
              'data-testid': 'amazon-waiting-notice',
              style: { backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' },
            },
            '⏳ Waiting for Amazon to update the page...'
          )
        : null,

      // Target notice when target cannot be highlighted safely
      targetStatus && targetStatus !== 'verified' && state.targetId !== null
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'status',
              'data-testid': 'amazon-target-notice',
            },
            targetStatus === 'missing' && getMessage(state.language, 'target_unavailable'),
            targetStatus === 'ambiguous' && getMessage(state.language, 'target_ambiguous'),
            targetStatus === 'hidden' && 'Next control is currently hidden on page.',
            targetStatus === 'disabled' && getMessage(state.language, 'target_disabled'),
            targetStatus === 'unsupported_page' && getMessage(state.language, 'unsupported_page')
          )
        : null,

      // Audio bar
      h(
        'div',
        { className: 'audio-bar' },
        h(
          'button',
          {
            className: 'audio-btn',
            onClick: handleReplayAudio,
            'aria-label': getMessage(state.language, 'replay_instruction'),
          },
          h('span', { 'aria-hidden': 'true' }, audioStatus === 'playing' || audioStatus === 'fallback' ? '⏹' : '🔊'),
          h(
            'span',
            null,
            audioStatus === 'playing' || audioStatus === 'fallback'
              ? 'Stop Audio'
              : getMessage(state.language, 'replay_instruction')
          )
        ),
        audioNotice ? h('span', { className: 'audio-status', role: 'status' }, audioNotice) : null
      ),

      // Language selector with speech preview
      h(
        'div',
        { className: 'language-selector' },
        h('span', { className: 'language-label' }, 'Language / భాష / भाषा'),
        h(
          'div',
          {
            className: 'language-buttons',
            role: 'group',
            'aria-label': 'Language options',
          },
          // Telugu Option
          h(
            'div',
            { className: 'lang-option-group' },
            h(
              'button',
              {
                className: `lang-btn ${state.language === 'te' ? 'active' : ''}`,
                onClick: () => handleLanguageChange('te'),
                'aria-pressed': state.language === 'te',
                'aria-label': 'Select Telugu language',
              },
              'తెలుగు'
            ),
            h(
              'button',
              {
                className: 'lang-speaker-btn',
                onClick: () => handlePlayLanguageName('te'),
                'aria-label': 'Listen to Telugu language name',
                title: 'Hear language name',
              },
              '🔊 వినండి'
            )
          ),
          // Hindi Option
          h(
            'div',
            { className: 'lang-option-group' },
            h(
              'button',
              {
                className: `lang-btn ${state.language === 'hi' ? 'active' : ''}`,
                onClick: () => handleLanguageChange('hi'),
                'aria-pressed': state.language === 'hi',
                'aria-label': 'Select Hindi language',
              },
              'हिन्दी'
            ),
            h(
              'button',
              {
                className: 'lang-speaker-btn',
                onClick: () => handlePlayLanguageName('hi'),
                'aria-label': 'Listen to Hindi language name',
                title: 'Hear language name',
              },
              '🔊 सुनें'
            )
          ),
          // English Option
          h(
            'div',
            { className: 'lang-option-group' },
            h(
              'button',
              {
                className: `lang-btn ${state.language === 'en' ? 'active' : ''}`,
                onClick: () => handleLanguageChange('en'),
                'aria-pressed': state.language === 'en',
                'aria-label': 'Select English language',
              },
              'English'
            ),
            h(
              'button',
              {
                className: 'lang-speaker-btn',
                onClick: () => handlePlayLanguageName('en'),
                'aria-label': 'Listen to English language name',
                title: 'Hear language name',
              },
              '🔊 Hear'
            )
          )
        )
      )
    )
  );
};
