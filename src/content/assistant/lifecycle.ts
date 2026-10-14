import React from 'react';
import ReactDOM, { type Root } from 'react-dom/client';
import { resolveAdapter } from '../adapters/pageAdapterRegistry.ts';
import type { SiteAdapter } from '../adapters/types.ts';
import { GuidanceController } from './guidanceController.ts';
import { TargetHighlighter } from './highlighter.ts';
import { ActionObserver } from './actionObserver.ts';
import { AssistantApp, type AssistantAppProps } from './AssistantApp.ts';
import { AmazonGuidanceController } from './amazonGuidanceController.ts';
import { AmazonActionObserver } from './amazonActionObserver.ts';
import { AmazonAssistantApp } from './AmazonAssistantApp.ts';
import { ShopSphereGuidanceController } from './shopsphereGuidanceController.ts';
import { ShopSphereActionObserver } from './shopsphereActionObserver.ts';
import { ShopSphereAssistantApp } from './ShopSphereAssistantApp.ts';
import { ASSISTANT_STYLES } from './styles.ts';
import { audioService } from '../../audio/index.ts';
import type { PaymentCoordinator } from '../../payments/paymentCoordinator.ts';

export const ASSISTANT_HOST_ID = 'voicecheckout-assistant-root';

export type AssistantRenderer = (
  container: HTMLElement,
  props: AssistantAppProps
) => { unmount: () => void };

export interface MountOptions {
  render?: AssistantRenderer;
  adapter?: SiteAdapter;
}

let activeHost: HTMLElement | null = null;
let activeReactRoot: { unmount: () => void } | null = null;
let activeController: GuidanceController | null = null;
let activeAmazonController: AmazonGuidanceController | null = null;
let activeShopSphereController: ShopSphereGuidanceController | null = null;
let activeCoordinator: PaymentCoordinator | null = null;
let activeHighlighter: TargetHighlighter | null = null;
let activeObserver: ActionObserver | null = null;
let activeAmazonObserver: AmazonActionObserver | null = null;
let activeShopSphereObserver: ShopSphereActionObserver | null = null;
let activeAdapter: SiteAdapter | null = null;

export function isAssistantMounted(): boolean {
  return activeHost !== null && activeHost.isConnected;
}

export function getActiveController(): GuidanceController | null {
  return activeController ?? (activeAmazonController as unknown as GuidanceController);
}

export function getActiveShopSphereController(): ShopSphereGuidanceController | null {
  return activeShopSphereController;
}

export function getActiveAmazonController(): AmazonGuidanceController | null {
  return activeAmazonController;
}

export function getActiveCoordinator(): PaymentCoordinator | null {
  return activeCoordinator;
}

export function getActiveHighlighter(): TargetHighlighter | null {
  return activeHighlighter;
}

export function getActiveHost(): HTMLElement | null {
  return activeHost;
}

export function getActiveObserver(): ActionObserver | null {
  return activeObserver;
}

export function getActiveAmazonObserver(): AmazonActionObserver | null {
  return activeAmazonObserver;
}

export function getActiveAdapter(): SiteAdapter | null {
  return activeAdapter;
}

const defaultRenderer: AssistantRenderer = (container, props) => {
  if (typeof window === 'undefined') {
    return { unmount: () => {} };
  }
  const root: Root = ReactDOM.createRoot(container);
  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(AssistantApp, props)
    )
  );
  return root;
};

/**
 * Mounts the VoiceCheckout assistant using an isolated Shadow DOM container.
 *
 * Requirements:
 * 1. Resolves a conforming SiteAdapter for the document (defaults to registered adapters).
 * 2. Verifies page support via the adapter's read-only detectPage().
 * 3. Prevents duplicate mounts if already active.
 * 4. Mounts React component inside the Shadow DOM boundary.
 * 5. Injects isolated CSS without polluting host document.
 * 6. Instantiates PaymentCoordinator ONLY if the adapter provides one (demo only).
 * 7. Returns boolean success.
 */
export function mountAssistant(doc?: Document, options?: MountOptions): boolean {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);
  if (!targetDoc || !targetDoc.body) {
    return false;
  }

  // 1. Resolve and verify site adapter support
  const adapter = options?.adapter ?? resolveAdapter(targetDoc);
  if (!adapter) {
    return false;
  }

  const support = adapter.detectPage(targetDoc);
  if (!support.supported) {
    return false;
  }

  // 2. Prevent duplicate assistant mounts
  if (isAssistantMounted()) {
    return true;
  }

  // 3. Ensure any stale elements are cleared
  unmountAssistant(targetDoc);

  try {
    // 4. Create isolated host element
    const host = targetDoc.createElement('div');
    host.id = ASSISTANT_HOST_ID;
    targetDoc.body.appendChild(host);

    // 5. Attach open Shadow Root
    const shadow = host.attachShadow({ mode: 'open' });

    // 6. Inject isolated styles
    const styleElement = targetDoc.createElement('style');
    styleElement.textContent = ASSISTANT_STYLES;
    shadow.appendChild(styleElement);

    // 7. Create React mount container inside Shadow DOM
    const container = targetDoc.createElement('div');
    container.id = 'voicecheckout-shadow-container';
    shadow.appendChild(container);

    const highlighter = new TargetHighlighter(adapter);

    // 8. Site-specific controller, observer, and UI mounting
    if (adapter.siteId === 'amazon_in') {
      const amazonController = new AmazonGuidanceController(adapter, 'en', targetDoc);
      const amazonObserver = new AmazonActionObserver({
        controller: amazonController,
        highlighter,
        adapter,
        doc: targetDoc,
      });

      let root: { unmount: () => void };
      if (options?.render) {
        root = options.render(container as unknown as HTMLElement, {
          controller: null as unknown as GuidanceController,
          highlighter,
          onClose: () => unmountAssistant(targetDoc),
        });
      } else if (typeof window === 'undefined') {
        root = { unmount: () => {} };
      } else {
        const reactRoot: Root = ReactDOM.createRoot(container);
        reactRoot.render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(AmazonAssistantApp, {
              controller: amazonController,
              highlighter,
              onClose: () => unmountAssistant(targetDoc),
            })
          )
        );
        root = reactRoot;
      }

      // Store references for lifecycle tracking
      activeHost = host as unknown as HTMLElement;
      activeReactRoot = root;
      activeController = null;
      activeAmazonController = amazonController;
      activeShopSphereController = null;
      activeCoordinator = null;
      activeHighlighter = highlighter;
      activeObserver = null;
      activeAmazonObserver = amazonObserver;
      activeShopSphereObserver = null;
      activeAdapter = adapter;

      return true;
    }

    // 8b. ShopSphere Controlled Storefront flow
    if (adapter.siteId === 'shopsphere-demo') {
      const shopsphereController = new ShopSphereGuidanceController(adapter, 'en', targetDoc);
      const shopsphereObserver = new ShopSphereActionObserver({
        controller: shopsphereController,
        highlighter,
        adapter,
        doc: targetDoc,
      });

      let root: { unmount: () => void };
      if (options?.render) {
        root = options.render(container as unknown as HTMLElement, {
          controller: null as unknown as GuidanceController,
          highlighter,
          onClose: () => unmountAssistant(targetDoc),
        });
      } else if (typeof window === 'undefined') {
        root = { unmount: () => {} };
      } else {
        const reactRoot: Root = ReactDOM.createRoot(container);
        reactRoot.render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(ShopSphereAssistantApp, {
              controller: shopsphereController,
              highlighter,
              onClose: () => unmountAssistant(targetDoc),
            })
          )
        );
        root = reactRoot;
      }

      // Store references for lifecycle tracking
      activeHost = host as unknown as HTMLElement;
      activeReactRoot = root;
      activeController = null;
      activeAmazonController = null;
      activeShopSphereController = shopsphereController;
      activeCoordinator = null;
      activeHighlighter = highlighter;
      activeObserver = null;
      activeAmazonObserver = null;
      activeShopSphereObserver = shopsphereObserver;
      activeAdapter = adapter;

      return true;
    }

    // Default: Controlled demo assistant flow
    const controller = new GuidanceController('en');
    const coordinator = adapter.createPaymentCoordinator
      ? adapter.createPaymentCoordinator(controller)
      : undefined;
    const actionObserver = new ActionObserver({
      controller,
      highlighter,
      doc: targetDoc,
      coordinator,
    });

    const renderer = options?.render ?? defaultRenderer;
    const root = renderer(container as unknown as HTMLElement, {
      controller,
      highlighter,
      onClose: () => unmountAssistant(targetDoc),
      coordinator,
    });

    // Store references for lifecycle tracking
    activeHost = host as unknown as HTMLElement;
    activeReactRoot = root;
    activeController = controller;
    activeAmazonController = null;
    activeShopSphereController = null;
    activeCoordinator = coordinator ?? null;
    activeHighlighter = highlighter;
    activeObserver = actionObserver;
    activeAmazonObserver = null;
    activeShopSphereObserver = null;
    activeAdapter = adapter;

    return true;
  } catch (err) {
    console.error('Failed to mount VoiceCheckout assistant:', err);
    unmountAssistant(targetDoc);
    return false;
  }
}

/**
 * Completely and idempotently unmounts the assistant, cleaning up all
 * DOM nodes, React roots, event listeners, observers, and temporary styles.
 */
export function unmountAssistant(doc?: Document): void {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);

  // 0. Stop any active audio playback
  try {
    audioService.stop();
  } catch {
    // Ignore audio stop errors
  }

  // 1. Dispose adapter resources
  if (activeAdapter) {
    try {
      activeAdapter.dispose();
    } catch {
      // Ignore adapter dispose errors
    }
    activeAdapter = null;
  }

  // 2. Disconnect action observers (removes document event listeners & MutationObservers)
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  if (activeAmazonObserver) {
    activeAmazonObserver.disconnect();
    activeAmazonObserver = null;
  }
  if (activeShopSphereObserver) {
    activeShopSphereObserver.disconnect();
    activeShopSphereObserver = null;
  }

  // 3. Clear target highlight and restore original inline styles
  if (activeHighlighter) {
    activeHighlighter.destroy();
    activeHighlighter = null;
  }

  // 4. Destroy guidance controllers and clear coordinator
  if (activeController) {
    activeController.destroy();
    activeController = null;
  }
  if (activeAmazonController) {
    activeAmazonController.destroy();
    activeAmazonController = null;
  }
  if (activeShopSphereController) {
    activeShopSphereController.destroy();
    activeShopSphereController = null;
  }
  if (activeCoordinator) {
    activeCoordinator = null;
  }

  // 5. Unmount React root safely
  if (activeReactRoot) {
    try {
      activeReactRoot.unmount();
    } catch {
      // Ignore errors if container was already detached
    }
    activeReactRoot = null;
  }

  // 6. Remove host element
  if (activeHost) {
    activeHost.remove();
    activeHost = null;
  }

  // 7. Cleanup any orphaned host or legacy placeholder elements
  if (targetDoc) {
    const existingHost = targetDoc.getElementById(ASSISTANT_HOST_ID);
    if (existingHost) {
      existingHost.remove();
    }
    const legacyAssistant = targetDoc.getElementById('voicecheckout-assistant');
    if (legacyAssistant) {
      legacyAssistant.remove();
    }
  }
}
