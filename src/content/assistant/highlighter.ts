import type { TargetId } from '../../guidance/types.ts';
import { lookupTarget, type TargetLookupResult } from '../targets/targetRegistry.ts';
import type { SiteAdapter } from '../adapters/types.ts';

interface SavedStyleProperty {
  value: string;
  priority: string;
}

type TrackedProperty = 'outline' | 'outline-offset' | 'box-shadow' | 'transition';

const TRACKED_PROPERTIES: readonly TrackedProperty[] = [
  'outline',
  'outline-offset',
  'box-shadow',
  'transition',
] as const;

/**
 * Manages contextual highlighting of verified targets on the host page.
 *
 * Safety Invariants:
 * 1. Strictly read-only: never activates, clicks, or submits host controls.
 * 2. Highlighting is applied ONLY to verified targets.
 * 3. Original styles are captured with priority and accurately restored.
 * 4. Never removes host-page styles.
 * 5. Complete and idempotent cleanup.
 */
export class TargetHighlighter {
  private currentElement: HTMLElement | null = null;
  private savedStyles: Map<TrackedProperty, SavedStyleProperty> = new Map();
  private adapter?: SiteAdapter;

  constructor(adapter?: SiteAdapter) {
    this.adapter = adapter;
  }

  /**
   * Updates target highlight based on target lookup.
   * Clears previous highlights if target changes or is not verified.
   */
  public update(
    targetId: TargetId | null,
    doc?: Document | null
  ): TargetLookupResult | null {
    if (!targetId) {
      this.clear();
      return null;
    }

    const lookupResult = this.adapter
      ? this.adapter.lookupTarget(targetId, doc)
      : lookupTarget(targetId, doc);

    if (lookupResult.status === 'verified') {
      this.highlight(lookupResult.element);
    } else {
      this.clear();
    }

    return lookupResult;
  }

  /**
   * Applies temporary highlight to a verified element after saving its original styles.
   */
  public highlight(element: HTMLElement): void {
    if (this.currentElement === element) {
      return;
    }

    // Clear any previous target first
    this.clear();

    // 1. Capture original inline style values and priorities
    this.savedStyles.clear();
    for (const prop of TRACKED_PROPERTIES) {
      const value = element.style?.getPropertyValue?.(prop) ?? '';
      const priority = element.style?.getPropertyPriority?.(prop) ?? '';
      this.savedStyles.set(prop, { value, priority });
    }

    // 2. Apply temporary highlight styles
    element.style?.setProperty?.('outline', '3px solid #3182ce', 'important');
    element.style?.setProperty?.('outline-offset', '4px', 'important');
    element.style?.setProperty?.(
      'box-shadow',
      '0 0 0 6px rgba(49, 130, 206, 0.25)',
      'important'
    );
    element.style?.setProperty?.(
      'transition',
      'outline 0.2s ease, box-shadow 0.2s ease',
      'important'
    );

    element.setAttribute('data-voicecheckout-highlight', 'true');
    this.currentElement = element;
  }

  /**
   * Restores original styles and removes temporary attributes.
   * Completely idempotent and safe to call repeatedly.
   */
  public clear(): void {
    if (!this.currentElement) {
      return;
    }

    const el = this.currentElement;

    // Restore original property values
    for (const [prop, saved] of this.savedStyles.entries()) {
      if (saved.value && saved.value.trim().length > 0) {
        el.style?.setProperty?.(prop, saved.value, saved.priority);
      } else {
        el.style?.removeProperty?.(prop);
      }
    }

    el.removeAttribute('data-voicecheckout-highlight');

    this.currentElement = null;
    this.savedStyles.clear();
  }

  public getHighlightedElement(): HTMLElement | null {
    return this.currentElement;
  }

  public destroy(): void {
    this.clear();
  }
}
