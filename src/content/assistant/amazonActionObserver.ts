import type { AmazonGuidanceController } from './amazonGuidanceController.ts';
import type { TargetHighlighter } from './highlighter.ts';
import type { SiteAdapter } from '../adapters/types.ts';

export interface AmazonActionObserverOptions {
  controller: AmazonGuidanceController;
  highlighter: TargetHighlighter;
  adapter: SiteAdapter;
  doc?: Document;
}

/**
 * AmazonActionObserver: Observes manual user actions and dynamic page changes on Amazon India.
 *
 * Safety Invariants:
 * 1. Strictly passive: listens for genuine user actions, never triggers clicks or submits.
 * 2. Does not automatically advance guidance: clicking a target only sets a waiting state.
 * 3. Step advancement requires real page evidence via adapter.observePageState().
 * 4. Stale-target safety: revalidates and unhighlights if target becomes hidden, disabled, or detached.
 * 5. Loop prevention: excludes style/highlight attributes from MutationObserver filter.
 */
export class AmazonActionObserver {
  private controller: AmazonGuidanceController;
  private highlighter: TargetHighlighter;
  private adapter: SiteAdapter;
  private doc: Document;
  private isActive: boolean = true;
  private clickListener: ((event: MouseEvent) => void) | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(options: AmazonActionObserverOptions) {
    this.controller = options.controller;
    this.highlighter = options.highlighter;
    this.adapter = options.adapter;
    this.doc = options.doc ?? (typeof document !== 'undefined' ? document : ({} as Document));

    this.attachListeners();
  }

  private attachListeners(): void {
    if (!this.doc || typeof this.doc.addEventListener !== 'function') {
      return;
    }

    // 1. Observe manual user clicks on verified targets
    this.clickListener = (event: MouseEvent) => {
      if (!this.isActive) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const highlighted = this.highlighter.getHighlightedElement();
      if (highlighted && (highlighted === target || highlighted.contains?.(target))) {
        // User personally clicked the verified target
        this.controller.notifyUserAction();
      }
    };

    this.doc.addEventListener('click', this.clickListener, true);

    // 2. Observe dynamic DOM mutations and revalidate page state & targets
    if (typeof MutationObserver !== 'undefined' && this.doc.body) {
      this.mutationObserver = new MutationObserver(() => {
        if (!this.isActive) return;
        this.handleDomMutation();
      });

      this.mutationObserver.observe(this.doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'aria-disabled'],
      });
    }
  }

  /**
   * Handles DOM mutation by re-evaluating page state and target verification.
   */
  public handleDomMutation(): void {
    if (!this.isActive) return;

    // Re-evaluate page state via adapter
    this.controller.handlePageUpdate(this.doc);

    // Re-validate and update highlight for active target
    const currentTargetId = this.controller.getState().targetId;
    this.highlighter.update(currentTargetId, this.doc);
  }

  public disconnect(): void {
    this.isActive = false;

    if (this.clickListener && typeof this.doc.removeEventListener === 'function') {
      this.doc.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}
