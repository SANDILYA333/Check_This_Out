import React, { useState, useEffect } from 'react';

export const App: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to assist');
  const [errorNotice, setErrorNotice] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const queryActiveTab = (callback: (tab: chrome.tabs.Tab) => void) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        callback(tabs[0]);
      } else {
        setErrorNotice('No active tab found.');
      }
    });
  };

  // Check current status on open
  useEffect(() => {
    queryActiveTab((tab) => {
      if (!tab.id) return;
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_CHECKOUT_STATE' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not yet injected
            setIsActive(false);
            return;
          }
          if (response?.supported) {
            setStatusMessage('Supported checkout page');
          }
        });
      } catch {
        // Ignore initial probe
      }
    });
  }, []);

  const sendStartMessage = (tabId: number) => {
    chrome.tabs.sendMessage(tabId, { type: 'START_ASSISTANCE' }, (response) => {
      setIsLoading(false);
      if (chrome.runtime.lastError) {
        setErrorNotice('Could not establish connection. Please refresh the page.');
        return;
      }
      if (response?.supported) {
        setIsActive(true);
        setStatusMessage('VoiceCheckout is active on page!');
        setErrorNotice('');
        // Close popup after brief delay to let user see the on-page overlay
        setTimeout(() => window.close(), 500);
      } else {
        setIsActive(false);
        setErrorNotice(
          response?.error === 'missing_marker' || response?.error === 'unsupported_page'
            ? 'Open ShopSphere or Amazon to use VoiceCheckout.'
            : `Unsupported: ${response?.error ?? 'unsupported page'}`
        );
      }
    });
  };

  const handleStart = () => {
    setIsLoading(true);
    setErrorNotice('');
    setStatusMessage('Starting assistance...');

    queryActiveTab((tab) => {
      if (!tab.id) {
        setIsLoading(false);
        return;
      }

      const tabId = tab.id;
      // First try sending message directly
      chrome.tabs.sendMessage(tabId, { type: 'START_ASSISTANCE' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not yet injected into this tab. Inject dynamically:
          if (chrome.scripting) {
            chrome.scripting.executeScript(
              {
                target: { tabId },
                files: ['assets/content.js'],
              },
              () => {
                if (chrome.runtime.lastError) {
                  setIsLoading(false);
                  setErrorNotice(
                    `Cannot inject on this page: ${chrome.runtime.lastError.message}. Please refresh the tab.`
                  );
                } else {
                  // Retry sending start message after brief mount delay
                  setTimeout(() => {
                    sendStartMessage(tabId);
                  }, 150);
                }
              }
            );
          } else {
            setIsLoading(false);
            setErrorNotice('Please refresh the page and try again.');
          }
        } else {
          // Direct response
          setIsLoading(false);
          if (response?.supported) {
            setIsActive(true);
            setStatusMessage('VoiceCheckout active on page!');
            setTimeout(() => window.close(), 500);
          } else {
            setIsActive(false);
            setErrorNotice(
              response?.error === 'missing_marker' || response?.error === 'unsupported_page'
                ? 'Open ShopSphere or Amazon to use VoiceCheckout.'
                : `Unsupported: ${response?.error ?? 'unsupported page'}`
            );
          }
        }
      });
    });
  };

  const handleStop = () => {
    setIsLoading(true);
    queryActiveTab((tab) => {
      if (!tab.id) {
        setIsLoading(false);
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'STOP_ASSISTANCE' }, () => {
        setIsLoading(false);
        setIsActive(false);
        setStatusMessage('Assistance stopped.');
      });
    });
  };

  return (
    <div
      style={{
        padding: '16px',
        width: '260px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#ffffff',
        color: '#0f172a',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
        }}
      >
        <span style={{ fontSize: '20px' }}>🎙️</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e3a8a' }}>
            VoiceCheckout
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Multilingual Voice Guide</span>
        </div>
      </header>

      <div style={{ marginBottom: '14px' }}>
        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#334155' }}>
          {statusMessage}
        </p>

        {errorNotice ? (
          <div
            style={{
              padding: '6px 8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '11.5px',
              color: '#b91c1c',
              marginBottom: '8px',
              lineHeight: 1.4,
            }}
          >
            {errorNotice}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '9px 12px',
                background: isLoading ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isLoading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🎙️</span>
              <span>{isLoading ? 'Starting...' : 'Start Assistance'}</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '9px 12px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isLoading ? 'default' : 'pointer',
              }}
            >
              Stop Assistance
            </button>
          )}
        </div>
      </div>

      <footer
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px',
          fontSize: '10.5px',
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Supports EN • HI • TE</span>
        <span>ShopSphere & Amazon</span>
      </footer>
    </div>
  );
};

export default App;