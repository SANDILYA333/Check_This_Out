import type { ShopSphereGuidanceController } from './shopsphereGuidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import type { SiteAdapter } from '../adapters/types.ts';
import type { Language } from '../../guidance/types.ts';

export interface ShopSphereActionObserverInit {
  controller: ShopSphereGuidanceController;
  highlighter: TargetHighlighter;
  adapter: SiteAdapter;
  doc?: Document | null;
}

export class ShopSphereActionObserver {
  private controller: ShopSphereGuidanceController;
  private highlighter: TargetHighlighter;
  private adapter: SiteAdapter;
  private doc: Document | null;
  private observer: MutationObserver | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private languageHandler: ((e: Event) => void) | null = null;
  private unsubscribeController: (() => void) | null = null;

  constructor(init: ShopSphereActionObserverInit) {
    this.controller = init.controller;
    this.highlighter = init.highlighter;
    this.adapter = init.adapter;
    this.doc = init.doc ?? (typeof document !== 'undefined' ? document : null);

    this.init();
  }

  private init(): void {
    if (!this.doc || !this.doc.body) return;

    // 1. Subscribe to guidance state changes to update visual highlighter
    this.unsubscribeController = this.controller.subscribe((state) => {
      if (this.doc) {
        this.highlighter.update(state.targetId, this.doc);
      }
    });

    // 2. Set up MutationObserver to detect state changes in the storefront
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => {
        this.controller.reevaluate();
      });

      this.observer.observe(this.doc.body, {
        attributes: true,
        attributeFilter: ['data-vc-page', 'data-vc-state', 'data-vc-lang'],
        childList: true,
        subtree: true,
      });
    }

    // 3. User manual action click listener to recheck targets after user clicks
    this.clickHandler = () => {
      setTimeout(() => {
        this.controller.reevaluate();
      }, 50);
    };
    this.doc.addEventListener('click', this.clickHandler, true);

    // 4. Synchronize storefront language changes to guidance controller
    this.languageHandler = (event: Event) => {
      const customEvt = event as CustomEvent<{ language?: Language }>;
      if (customEvt.detail?.language) {
        this.controller.setLanguage(customEvt.detail.language);
      }
    };
    this.doc.addEventListener('voicecheckout:set-language', this.languageHandler);
  }

  public disconnect(): void {
    if (this.unsubscribeController) {
      this.unsubscribeController();
      this.unsubscribeController = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.clickHandler && this.doc) {
      this.doc.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }

    if (this.languageHandler && this.doc) {
      this.doc.removeEventListener('voicecheckout:set-language', this.languageHandler);
      this.languageHandler = null;
    }
  }
}
