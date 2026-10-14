import React from 'react';

const App: React.FC = () => {
  const startAssistance = () => {
    // Send message to content script to start assistance
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ASSISTANCE' });
      }
    });
  };

  return (
    <div style={{ padding: '16px', width: '200px' }}>
      <h2>VoiceCheckout</h2>
      <button onClick={startAssistance}>Start assistance</button>
    </div>
  );
};

export default App;