import { registerAdapter, resolveAdapter } from './adapters/pageAdapterRegistry.ts';
import { shopsphereCheckoutAdapter } from './adapters/shopsphereCheckoutAdapter.ts';
import { isExtensionRequest } from '../shared/messaging/contracts.ts';
import {
  mountAssistant,
  unmountAssistant,
  isAssistantMounted,
} from './assistant/lifecycle.ts';
import { mockPaymentService } from '../payments/mockPaymentService.ts';
import type { PaymentScenario } from '../payments/types.ts';

// Register ShopSphere controlled storefront adapter
registerAdapter(shopsphereCheckoutAdapter);

// Synchronize scenario configuration from the host demo page
if (typeof document !== 'undefined') {
  document.addEventListener('voicecheckout:set-scenario', (event: Event) => {
    const customEvt = event as CustomEvent<{ scenario?: PaymentScenario }>;
    if (customEvt.detail?.scenario) {
      mockPaymentService.setScenario(customEvt.detail.scenario);
    }
  });

  const pageScenario = document.body?.getAttribute('data-voicecheckout-scenario') as PaymentScenario | null;
  if (pageScenario) {
    mockPaymentService.setScenario(pageScenario);
  }
}

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isExtensionRequest(message)) {
    return false;
  }

  const targetDoc = typeof document !== 'undefined' ? document : null;
  const adapter = resolveAdapter(targetDoc);

  if (message.type === 'START_ASSISTANCE') {
    if (adapter && targetDoc) {
      const support = adapter.detectPage(targetDoc);
      if (support.supported) {
        const mounted = mountAssistant(targetDoc, { adapter });
        sendResponse({ supported: true, state: mounted ? undefined : undefined });
      } else {
        sendResponse({ supported: false, error: support.reason });
      }
    } else {
      sendResponse({ supported: false, error: 'unsupported_page' });
    }
  } else if (message.type === 'STOP_ASSISTANCE') {
    unmountAssistant(targetDoc ?? undefined);
    sendResponse({ stopped: true });
  } else if (message.type === 'GET_CHECKOUT_STATE') {
    const supported = adapter && targetDoc ? adapter.detectPage(targetDoc).supported : false;
    sendResponse({
      supported,
      state: undefined,
    });
  }

  return true;
});