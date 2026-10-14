/**
 * Isolated CSS styles injected directly into the Shadow DOM.
 * Designed for 360px+ responsive viewports, WCAG high contrast, and keyboard visibility.
 */
export const ASSISTANT_STYLES = `
:host {
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: visible;
  z-index: 2147483647;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Telugu", "Gautami", "Vani", "Noto Sans Devanagari", "Mangal", "Aparajita", Helvetica, Arial, sans-serif;
  color: #1a202c;
  line-height: 1.5;
  box-sizing: border-box;
  pointer-events: none;
}

*, *::before, *::after {
  box-sizing: border-box;
}

#voicecheckout-shadow-container {
  pointer-events: none;
}

.assistant-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 360px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid #cbd5e0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

/* Header */
.assistant-header {
  background: #2b6cb0;
  color: #ffffff;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.assistant-header:active {
  cursor: grabbing;
}

.assistant-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.05rem;
  pointer-events: none;
}

.assistant-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.assistant-header-btn,
.assistant-close-btn,
.assistant-minimize-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  line-height: 1;
  transition: background 0.15s ease;
}

.assistant-header-btn:hover,
.assistant-close-btn:hover,
.assistant-minimize-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.assistant-header-btn:focus-visible,
.assistant-close-btn:focus-visible,
.assistant-minimize-btn:focus-visible {
  outline: 3px solid #f6e05e;
  outline-offset: 2px;
}

/* Minimized Floating Pill */
.assistant-minimized-pill {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #2b6cb0, #2c5282);
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 9999px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 4px 10px -2px rgba(0, 0, 0, 0.15);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: grab;
  pointer-events: auto;
  user-select: none;
  touch-action: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: box-shadow 0.15s ease;
  z-index: 2147483647;
}

.assistant-minimized-pill:hover {
  box-shadow: 0 14px 28px -4px rgba(0, 0, 0, 0.35);
}

.assistant-minimized-pill:active {
  cursor: grabbing;
}

.minimized-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  pointer-events: none;
}

.minimized-step {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  pointer-events: none;
}

.minimized-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #ffffff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  transition: background 0.15s ease;
}

.minimized-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.minimized-btn:focus-visible {
  outline: 2px solid #f6e05e;
  outline-offset: 1px;
}

/* Content Body */
.assistant-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-badge {
  display: inline-block;
  align-self: flex-start;
  background: #ebf8ff;
  color: #2b6cb0;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #bee3f8;
}

.stage-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
}

.stage-instruction {
  margin: 0;
  font-size: 0.95rem;
  color: #4a5568;
}

/* Audio control bar */
.audio-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
}

.audio-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2b6cb0;
  cursor: pointer;
  min-height: 38px;
}

.audio-btn:hover {
  background: #edf2f7;
}

.audio-btn:focus-visible {
  outline: 3px solid #3182ce;
  outline-offset: 2px;
}

.audio-status {
  font-size: 0.75rem;
  color: #718096;
}

/* PIN Safety Warning Box */
.pin-warning-box {
  background: #fff5f5;
  border: 2px solid #e53e3e;
  border-radius: 8px;
  padding: 12px;
  color: #9b2c2c;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Target Status Notice */
.target-notice {
  background: #feebc8;
  border: 1px solid #f6ad55;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #7b341e;
}

/* Language selector */
.language-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.language-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.language-buttons {
  display: flex;
  gap: 8px;
}

.lang-option-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lang-speaker-btn {
  background: #f7fafc;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #4a5568;
  padding: 4px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 30px;
}

.lang-speaker-btn:hover {
  background: #edf2f7;
  color: #2b6cb0;
}

.lang-speaker-btn:focus-visible {
  outline: 2px solid #3182ce;
  outline-offset: 1px;
}

.lang-btn {
  width: 100%;
  background: #edf2f7;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  padding: 8px 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: #4a5568;
  text-align: center;
  min-height: 40px;
}

.lang-btn:hover {
  background: #e2e8f0;
}

.lang-btn.active {
  background: #3182ce;
  color: #ffffff;
  border-color: #2b6cb0;
}

.lang-btn:focus-visible {
  outline: 3px solid #3182ce;
  outline-offset: 2px;
}

/* Action controls */
.assistant-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.btn-secondary {
  background: #edf2f7;
  color: #2d3748;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-secondary:focus-visible {
  outline: 3px solid #3182ce;
  outline-offset: 2px;
}

.btn-primary {
  flex: 1;
  background: #3182ce;
  color: #ffffff;
  border: 1px solid #2b6cb0;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-primary:hover {
  background: #2b6cb0;
}

.btn-primary:focus-visible {
  outline: 3px solid #3182ce;
  outline-offset: 2px;
}

.btn-retry {
  flex: 1;
  background: #dd6b20;
  color: #ffffff;
  border: 1px solid #c05621;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-retry:hover {
  background: #c05621;
}

.btn-retry:focus-visible {
  outline: 3px solid #dd6b20;
  outline-offset: 2px;
}

/* Error message */
.error-banner {
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  padding: 8px 12px;
  color: #c53030;
  font-size: 0.85rem;
}

/* ShopSphere Assistant Theme */
.voicecheckout-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 360px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 2147483647;
  font-family: inherit;
  transition: box-shadow 0.2s ease;
}

.voicecheckout-header {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  color: #ffffff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.voicecheckout-header:active {
  cursor: grabbing;
}

.voicecheckout-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
}

.voicecheckout-logo-icon {
  font-size: 16px;
}

.voicecheckout-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.voicecheckout-icon-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #ffffff;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.15s ease;
}

.voicecheckout-icon-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.voicecheckout-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
}

.voicecheckout-instructions {
  background: #f8fafc;
  border-left: 4px solid #2563eb;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #1e293b;
}

.voicecheckout-instructions p {
  margin: 0;
}

.voicecheckout-replay-btn:hover {
  filter: brightness(1.1);
}

.voicecheckout-footer {
  padding: 10px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #64748b;
}

.voicecheckout-version-tag {
  font-size: 10.5px;
  color: #64748b;
  font-weight: 500;
}

.voicecheckout-text-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.voicecheckout-minimized-badge {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 9999px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  pointer-events: auto;
  z-index: 2147483647;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.voicecheckout-minimized-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px -4px rgba(0, 0, 0, 0.35);
}

/* Responsive adjustment for small screens */
@media (max-width: 400px) {
  :host {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  .assistant-panel,
  .voicecheckout-panel {
    width: 100%;
  }
}
`;
