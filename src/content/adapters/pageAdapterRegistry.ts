import type { SiteAdapter } from './types.ts';
import { demoCheckoutAdapter } from './demoCheckoutAdapter.ts';
import { amazonCheckoutAdapter } from './amazonCheckoutAdapter.ts';

const registry: SiteAdapter[] = [
  demoCheckoutAdapter,
  amazonCheckoutAdapter,
];

/**
 * Registers a site adapter into the global adapter registry.
 * Replaces any existing adapter with matching siteId to prevent duplicate registration.
 */
export function registerAdapter(adapter: SiteAdapter): void {
  const existingIndex = registry.findIndex((a) => a.siteId === adapter.siteId);
  if (existingIndex >= 0) {
    registry[existingIndex] = adapter;
  } else {
    registry.push(adapter);
  }
}

/**
 * Unregisters a site adapter by its siteId.
 */
export function unregisterAdapter(siteId: string): void {
  const existingIndex = registry.findIndex((a) => a.siteId === siteId);
  if (existingIndex >= 0) {
    registry.splice(existingIndex, 1);
  }
}

/**
 * Resolves the appropriate SiteAdapter for the provided document.
 * Iterates through registered adapters and returns the first adapter that detects supported page state.
 * Returns null if no adapter recognizes the document.
 *
 * Safety Invariant:
 * Strictly read-only: adapters inspect page attributes without clicking, mutating, or submitting.
 */
export function resolveAdapter(doc?: Document | null): SiteAdapter | null {
  if (!doc) {
    return null;
  }

  for (const adapter of registry) {
    try {
      const detection = adapter.detectPage(doc);
      if (detection.supported) {
        return adapter;
      }
    } catch {
      // Defensive guard against throwing adapters
      continue;
    }
  }

  return null;
}

/**
 * Returns a read-only snapshot of all currently registered adapters.
 */
export function getRegisteredAdapters(): readonly SiteAdapter[] {
  return [...registry];
}

/**
 * Resets the adapter registry to the initial baseline (containing demo, shopsphere, and amazon adapters).
 * Useful for test isolation.
 */
export function resetAdapterRegistry(): void {
  registry.length = 0;
  registry.push(demoCheckoutAdapter, amazonCheckoutAdapter);
}
