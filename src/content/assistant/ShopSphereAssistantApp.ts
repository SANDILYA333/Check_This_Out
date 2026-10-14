import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../../guidance/types.ts';
import type { MessageKey } from '../../localization/types.ts';
import type { ShopSphereGuidanceController, ShopSphereGuidanceState } from './shopsphereGuidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import { getMessage } from '../../localization/index.ts';
import { audioService } from '../../audio/index.ts';
import type { AudioPlaybackStatus } from '../../audio/audioTypes.ts';

export interface ShopSphereAssistantAppProps {
  controller: ShopSphereGuidanceController;
  highlighter: TargetHighlighter;
  onClose: () => void;
}

export const ShopSphereAssistantApp: React.FC<ShopSphereAssistantAppProps> = ({
  controller,
  highlighter,
  onClose,
}) => {
  const [state, setState] = useState<ShopSphereGuidanceState>(controller.getState());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackStatus>('idle');
  const [audioNotice, setAudioNotice] = useState<string>('');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    const unsubscribeState = controller.subscribe((newState) => {
      setState(newState);
    });

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
  }, [controller]);

  const rawInstructionText = getMessage(state.language, state.instructionKey);
  const pinWarningText = getMessage(state.language, 'upi_safety_warning');

  // Compute dynamic instruction text if on review page to reflect current grand total
  const instructionText = React.useMemo(() => {
    if (state.instructionKey === 'shopsphere_review_instruction') {
      const totalAttr = typeof document !== 'undefined' ? document.body.getAttribute('data-vc-total') : null;
      const totalVal = totalAttr ? parseInt(totalAttr, 10) : 0;
      if (totalVal > 0) {
        if (state.language === 'te') {
          return `కొనసాగడానికి ముందు మీ వస్తువులు, డెలివరీ ఎంపిక, చెల్లింపు పద్ధతి మరియు మొత్తం మొత్తం ₹${totalVal.toLocaleString('en-IN')} రూపాయలను సమీక్షించండి.`;
        } else if (state.language === 'hi') {
          return `जारी रखने से पहले अपने आइटम, डिलीवरी विकल्प, भुगतान विधि और कुल राशि ₹${totalVal.toLocaleString('en-IN')} की समीक्षा करें।`;
        } else {
          return `Review your items, delivery choice, payment method, and grand total of ₹${totalVal.toLocaleString('en-IN')} before continuing.`;
        }
      }
    }
    return rawInstructionText;
  }, [state.language, state.instructionKey, rawInstructionText]);

  // Listen for custom play-total event
  useEffect(() => {
    const handlePlayTotalEvent = () => {
      audioService.play(state.language, 'order_total_spoken');
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('voicecheckout:play-total', handlePlayTotalEvent);
      return () => {
        document.removeEventListener('voicecheckout:play-total', handlePlayTotalEvent);
      };
    }
  }, [state.language]);

  // Auto-play audio when state/instruction or language changes
  const lastPromptRef = useRef<string>('');
  useEffect(() => {
    const promptId = `${state.language}:${state.instructionKey}`;
    if (lastPromptRef.current !== promptId) {
      lastPromptRef.current = promptId;
      audioService.play(state.language, state.instructionKey, instructionText).catch(() => {});
    }
  }, [state.instructionKey, state.language, instructionText]);

  const handleNextStep = () => {
    audioService.stop();
    controller.nextStep();
  };

  const handlePrevStep = () => {
    audioService.stop();
    controller.prevStep();
  };

  const handleLanguageChange = (lang: Language) => {
    audioService.stop();
    controller.setLanguage(lang);
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-vc-lang', lang);
      document.dispatchEvent(new CustomEvent('voicecheckout:set-language', { detail: { language: lang } }));
    }
  };

  const handlePlayLanguageName = (lang: Language) => {
    const key = `lang_name_${lang}` as MessageKey;
    audioService.play(lang, key);
  };

  const handleReplayAudio = async () => {
    if (audioStatus === 'playing' || audioStatus === 'fallback') {
      audioService.stop();
    } else {
      await audioService.play(state.language, state.instructionKey, instructionText);
    }
  };

  const handlePlayPinWarning = () => {
    audioService.play(state.language, 'upi_safety_warning', pinWarningText);
  };

  const handleClose = () => {
    audioService.stop();
    onClose();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, a')) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newX = Math.max(10, Math.min(window.innerWidth - 380, dragRef.current.posX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 300, dragRef.current.posY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer release errors
      }
    }
  };

  if (isMinimized) {
    return React.createElement(
      'div',
      {
        className: 'voicecheckout-minimized-badge',
        onClick: () => setIsMinimized(false),
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Expand VoiceCheckout Assistant',
        style: { right: `${position.x}px`, bottom: `${position.y}px` },
      },
      React.createElement('span', { className: 'badge-icon' }, '🎙️'),
      React.createElement('span', { className: 'badge-text' }, 'VoiceCheckout')
    );
  }

  const isAudioActive = audioStatus === 'playing' || audioStatus === 'fallback';

  return React.createElement(
    'section',
    {
      ref: panelRef,
      className: 'voicecheckout-panel',
      role: 'region',
      'aria-label': 'VoiceCheckout Assistant',
      style: {
        right: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
      },
    },
    // Header
    React.createElement(
      'header',
      {
        className: 'voicecheckout-header',
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        style: { cursor: 'grab', userSelect: 'none' },
      },
      React.createElement(
        'div',
        { className: 'voicecheckout-title' },
        React.createElement('span', { className: 'voicecheckout-logo-icon' }, '🎙️'),
        React.createElement(
          'span',
          { style: { fontWeight: 700 } },
          getMessage(state.language, 'assistant_title')
        )
      ),
      React.createElement(
        'div',
        { className: 'voicecheckout-controls' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'voicecheckout-icon-btn',
            onClick: () => setIsMinimized(true),
            'aria-label': 'Minimize VoiceCheckout Assistant',
            title: 'Minimize',
          },
          '—'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'voicecheckout-icon-btn',
            onClick: handleClose,
            'aria-label': getMessage(state.language, 'close_assistance'),
            title: 'Close Assistant',
          },
          '✕'
        )
      )
    ),

    // Step Progress Badge
    state.stepNumber && state.totalSteps
      ? React.createElement(
          'div',
          {
            style: {
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 14px',
              borderBottom: '1px solid #dbeafe',
              display: 'flex',
              justifyContent: 'space-between',
            },
          },
          React.createElement('span', null, `Step ${state.stepNumber} of ${state.totalSteps}`),
          React.createElement('span', null, state.pageState.replace(/_/g, ' '))
        )
      : null,

    // Body
    React.createElement(
      'div',
      { className: 'voicecheckout-body' },
      // Language selector with preview buttons
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '12px',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '6px' } },
          (['en', 'hi', 'te'] as Language[]).map((lang) =>
            React.createElement(
              'button',
              {
                key: lang,
                type: 'button',
                style: {
                  background: state.language === lang ? '#2563eb' : '#ffffff',
                  color: state.language === lang ? '#ffffff' : '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                },
                onClick: () => handleLanguageChange(lang),
              },
              lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'TE'
            )
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '4px' } },
          (['en', 'hi', 'te'] as Language[]).map((lang) =>
            React.createElement(
              'button',
              {
                key: `preview-${lang}`,
                type: 'button',
                style: {
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                },
                title: `Hear ${lang.toUpperCase()}`,
                onClick: () => handlePlayLanguageName(lang),
              },
              '🔊'
            )
          )
        )
      ),

      // Instruction Text
      React.createElement(
        'div',
        { className: 'voicecheckout-instructions' },
        React.createElement('p', { style: { fontSize: '13.5px', lineHeight: '1.5', color: '#1e293b' } }, instructionText)
      ),

      // Replay Audio Button
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' } },
        React.createElement(
          'button',
          {
            type: 'button',
            className: `voicecheckout-replay-btn ${isAudioActive ? 'active' : ''}`,
            onClick: handleReplayAudio,
            'aria-label': getMessage(state.language, 'replay_instruction'),
            style: {
              background: isAudioActive ? '#dc2626' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            },
          },
          React.createElement('span', null, isAudioActive ? '⏹' : '🔊'),
          React.createElement('span', null, isAudioActive ? 'Stop Audio' : getMessage(state.language, 'replay_instruction'))
        ),
        state.pageState === 'ORDER_REVIEW' || state.pageState === 'DEMO_PAYMENT'
          ? React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => audioService.play(state.language, 'order_total_spoken'),
                style: {
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                },
                title: 'Hear Grand Total in Spoken Audio',
              },
              React.createElement('span', null, '🔊'),
              React.createElement(
                'span',
                null,
                state.language === 'te'
                  ? 'మొత్తం మొత్తాన్ని వినండి'
                  : state.language === 'hi'
                  ? 'कुल राशि सुनें'
                  : 'Hear Total'
              )
            )
          : null,
        audioNotice
          ? React.createElement(
              'span',
              { style: { fontSize: '11px', color: '#64748b' } },
              audioNotice
            )
          : null
      ),

      // Next & Previous Step Navigation Controls
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #e2e8f0',
          },
        },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: handlePrevStep,
            disabled: !controller.hasPrevStep(),
            style: {
              background: '#f1f5f9',
              color: controller.hasPrevStep() ? '#334155' : '#94a3b8',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: controller.hasPrevStep() ? 'pointer' : 'default',
              opacity: controller.hasPrevStep() ? 1 : 0.6,
            },
            title: 'Previous instruction',
          },
          '← Previous'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: handleNextStep,
            disabled: !controller.hasNextStep(),
            style: {
              background: controller.hasNextStep() ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: controller.hasNextStep() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: controller.hasNextStep() ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
            },
            title: 'Load and play next instruction',
          },
          React.createElement('span', null, 'Next Instruction'),
          React.createElement('span', null, '→')
        )
      ),

      // Safety PIN Warning on checkout payment stages
      ['PAYMENT_SELECTION', 'ORDER_REVIEW', 'DEMO_PAYMENT'].includes(state.pageState)
        ? React.createElement(
            'div',
            {
              className: 'voicecheckout-pin-warning',
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '8px 10px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            },
            React.createElement(
              'span',
              { style: { fontSize: '11px', color: '#991b1b', fontWeight: 600 } },
              `⚠️ ${pinWarningText}`
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' },
                title: 'Hear PIN Warning',
                onClick: handlePlayPinWarning,
              },
              '🔊'
            )
          )
        : null
    ),

    // Footer
    React.createElement(
      'footer',
      { className: 'voicecheckout-footer' },
      React.createElement(
        'span',
        { className: 'voicecheckout-version-tag' },
        'ShopSphere Demo • Non-Automated'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'voicecheckout-text-btn',
          onClick: handleClose,
        },
        getMessage(state.language, 'close_assistance')
      )
    )
  );
};
