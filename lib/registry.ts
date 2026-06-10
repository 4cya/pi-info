/**
 * Dynamic segment registry. External code (other extensions, agent-written
 * scripts) can register SegmentProvider instances that appear in the footer
 * alongside built-in segments. /info toggles their visibility; config
 * persists in pi-info.json.
 */

import billingProvider from "../segments/billing.js";
import branchProvider from "../segments/branch.js";
import cacheProvider from "../segments/cache.js";
import cwdProvider from "../segments/cwd.js";
import ioProvider from "../segments/io.js";
import type { SegmentProvider } from "../segments/types.js";

export const registeredSegments = new Map<string, SegmentProvider>();
export const visibleDynamic = new Set<string>();

/**
 * Register a dynamic footer segment. Safe to call at any time.
 * Already-registered names are replaced.
 */
export function registerSegment(provider: SegmentProvider) {
	registeredSegments.set(provider.name, provider);
	// New segments default to visible. Persist is handled by the caller or /info.
	if (!visibleDynamic.has(provider.name)) {
		visibleDynamic.add(provider.name);
	}
}

/** Remove a previously registered segment. */
export function unregisterSegment(name: string) {
	registeredSegments.delete(name);
	visibleDynamic.delete(name);
}

// Built-in dynamic segments, hidden/shown via /info like any other.
registerSegment(billingProvider);
registerSegment(branchProvider);
registerSegment(cacheProvider);
registerSegment(cwdProvider);
registerSegment(ioProvider);
