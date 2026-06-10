/**
 * State surface the configurators need from the extension entry. The entry
 * owns the mutable session state (visible segments, status filter, per-segment
 * configs); configurators read and write through this interface so persistence
 * and re-rendering stay in one place.
 */

import type { SegmentConfig } from "../config.js";
import type { SegmentName } from "../constants.js";
import type { StatusFilter } from "../status-filter.js";

export type ConfiguratorDeps = {
	getVisibleSegments(): readonly SegmentName[];
	/** Persists and re-renders. */
	setVisibleSegments(segments: readonly SegmentName[]): void;
	getStatusFilter(): StatusFilter;
	/** Persists and re-renders. */
	setStatusFilter(filter: StatusFilter): void;
	getSegmentConfigs(): Record<string, SegmentConfig>;
	/**
	 * Merge a patch into one segment's config. `undefined` values delete the
	 * key (restoring the default). Persists and re-renders.
	 */
	updateSegmentConfig(name: string, patch: Partial<SegmentConfig>): void;
	getSeparator(): { char: string; color: string };
	/** Persists and re-renders. */
	setSeparator(char: string): void;
	/** Persists and re-renders. */
	setSeparatorColor(color: string): void;
	seenStatusKeys: Set<string>;
	refresh(): void;
};
