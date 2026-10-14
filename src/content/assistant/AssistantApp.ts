import React, { useEffect, useState, useRef } from 'react';
import type { CheckoutState, Language } from '../../guidance/types.ts';
import type { GuidanceController } from './guidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import type { TargetLookupResult } from '../targets/targetRegistry.ts';
import {
  getMessage,
  getStageMessageMapping,
  type MessageKey,
} from '../../localization/index.ts';
import { audioService, type AudioPlaybackStatus } from '../../audio/index.ts';
import type { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';

export interface AssistantAppProps {
  controller: GuidanceController;
  highlighter: TargetHighlighter;
  onClose: () => void;
  coordinator?: PaymentCoordinator;
}

const h = React.createElement;

export const AssistantApp: React.FC<AssistantAppProps> = ({
  controller,
  highlighter,
  onClose,
  coordinator,
}) => {
  const [state, setState] = useState<CheckoutState>(controller.getState());
  const [targetStatus, setTargetStatus] = useState<TargetLookupResult['status'] | null>(
    null
  );
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackStatus>(
    audioService.getStatus()
  );
  const [audioNotice, setAudioNotice] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const doc = typeof document !== 'undefined' ? document : null;
    const res = doc ? highlighter.update(state.targetId, doc) : null;
    if (res) {
      setTargetStatus(res.status);
    } else {
      setTargetStatus(null);
    }

    // Subscribe to checkout state changes
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
        setAudioNotice('Audio unavailable.');
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

  const stageMapping = getStageMessageMapping(state.stage);
  const stageTitle = getMessage(state.language, stageMapping.titleKey);
  const stageInstruction = getMessage(state.language, stageMapping.instructionKey);
  const pinWarningText = getMessage(state.language, 'upi_safety_warning');
  const lastError = controller.getLastError() || coordinator?.getLastError() || null;

  const handleLanguageChange = (lang: Language) => {
    audioService.stop();
    controller.dispatch({ type: 'SWITCH_LANGUAGE', language: lang });
  };

  const handlePlayLanguageName = (lang: Language) => {
    const key = `lang_name_${lang}` as MessageKey;
    audioService.play(lang, key);
  };

  const handleReplayAudio = async () => {
    if (audioStatus === 'playing' || audioStatus === 'fallback') {
      audioService.stop();
    } else {
      await audioService.play(state.language, stageMapping.instructionKey, stageInstruction);
    }
  };

  const handlePlayPinWarning = () => {
    audioService.play(state.language, 'upi_safety_warning');
  };

  const handleBack = () => {
    audioService.stop();
    controller.dispatch({ type: 'BACK' });
  };

  const handleRetry = () => {
    audioService.stop();
    if (coordinator) {
      coordinator.retry();
    } else {
      controller.dispatch({ type: 'RETRY' });
    }
  };

  const handleCheckPendingStatus = async () => {
    audioService.stop();
    if (coordinator) {
      await coordinator.recheckPendingStatus();
    }
  };

  const handleStart = () => {
    audioService.stop();
    controller.dispatch({ type: 'START_ASSISTANCE' });
  };

  const handleSelectLanguage = () => {
    audioService.stop();
    controller.dispatch({ type: 'SELECT_LANGUAGE', language: state.language });
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

  const canGoBack =
    state.stage === 'ADDRESS_CHANGE_STUB' ||
    state.stage === 'METHOD' ||
    state.stage === 'REVIEW' ||
    state.stage === 'UPI_SIMULATION';

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
      stageMapping.stepNumber && stageMapping.totalSteps
        ? h(
            'span',
            { className: 'minimized-step' },
            `Step ${stageMapping.stepNumber}/${stageMapping.totalSteps}`
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
      'aria-label': 'VoiceCheckout Assistant',
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
        h('span', null, getMessage(state.language, 'assistant_title'))
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
      // Step badge
      stageMapping.stepNumber && stageMapping.totalSteps
        ? h(
            'div',
            {
              className: 'step-badge',
              'aria-label': `Step ${stageMapping.stepNumber} of ${stageMapping.totalSteps}`,
            },
            `Step ${stageMapping.stepNumber} of ${stageMapping.totalSteps}`
          )
        : null,
      // Stage title
      h('h2', { className: 'stage-title' }, stageTitle),
      // Stage instruction
      h('p', { className: 'stage-instruction' }, stageInstruction),
      // Active transaction ID indicator (for transparent transaction tracking)
      state.transactionId
        ? h(
            'div',
            {
              className: 'txn-indicator',
              'data-testid': 'assistant-transaction-id',
              style: {
                fontSize: '11px',
                color: '#64748b',
                fontFamily: 'monospace',
                marginBottom: '8px',
              },
            },
            `Txn: ${state.transactionId}`
          )
        : null,
      // UPI PIN safety warning (prominent across all languages during UPI simulation)
      stageMapping.hasPinWarning
        ? h(
            'div',
            {
              className: 'pin-warning-box',
              role: 'alert',
              'data-testid': 'assistant-pin-warning',
            },
            h('span', { 'aria-hidden': 'true' }, '⚠️'),
            h('span', null, pinWarningText),
            h(
              'button',
              {
                className: 'lang-speaker-btn',
                onClick: handlePlayPinWarning,
                'aria-label': 'Listen to PIN safety warning',
                style: { marginLeft: 'auto' },
              },
              '🔊'
            )
          )
        : null,
      // Target status notice
      targetStatus && targetStatus !== 'verified'
        ? h(
            'div',
            {
              className: 'target-notice',
              role: 'status',
              'data-testid': 'assistant-target-notice',
            },
            targetStatus === 'missing' &&
              getMessage(state.language, 'target_unavailable'),
            targetStatus === 'ambiguous' &&
              getMessage(state.language, 'target_ambiguous'),
            targetStatus === 'hidden' &&
              'Next control is currently hidden on page.',
            targetStatus === 'disabled' &&
              getMessage(state.language, 'target_disabled'),
            targetStatus === 'unsupported_page' &&
              getMessage(state.language, 'unsupported_page')
          )
        : null,
      // Error banner
      lastError
        ? h('div', { className: 'error-banner', role: 'alert' }, lastError)
        : null,
      // Audio control bar
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
        audioNotice
          ? h('span', { className: 'audio-status', role: 'status' }, audioNotice)
          : null
      ),
      // Language selector
      h(
        'div',
        { className: 'language-selector' },
        h(
          'span',
          { className: 'language-label' },
          'Language / భాష / भाषा'
        ),
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
      ),
      // Assistant controls
      h(
        'div',
        { className: 'assistant-controls' },
        canGoBack
          ? h(
              'button',
              {
                className: 'btn-secondary',
                onClick: handleBack,
                'aria-label': getMessage(state.language, 'back_button'),
              },
              getMessage(state.language, 'back_button')
            )
          : null,
        state.stage === 'WELCOME'
          ? h(
              'button',
              {
                className: 'btn-primary',
                onClick: handleStart,
              },
              getMessage(state.language, 'start_assistance')
            )
          : null,
        state.stage === 'LANGUAGE'
          ? h(
              'button',
              {
                className: 'btn-primary',
                onClick: handleSelectLanguage,
              },
              getMessage(state.language, 'continue_button')
            )
          : null,
        state.stage === 'FAILED'
          ? h(
              'button',
              {
                className: 'btn-retry',
                onClick: handleRetry,
              },
              `🔄 ${getMessage(state.language, 'retry_instruction')}`
            )
          : null,
        state.stage === 'PENDING'
          ? h(
              'button',
              {
                className: 'btn-primary',
                onClick: handleCheckPendingStatus,
                'data-testid': 'assistant-recheck-status',
                'aria-label': getMessage(state.language, 'check_status_button'),
              },
              `🔍 ${getMessage(state.language, 'check_status_button')}`
            )
          : null
      )
    )
  );
};
