/**
 * State surface the configurators need from the extension entry. The entry
 * owns the mutable session state (visible segments, status filter, colors,
 * order); configurators read and write through this interface so persistence
 * and re-rendering stay in one place.
 */

import type { SegmentName } from "../constants.js";
import type { StatusFilter } from "../status-filter.js";

export type ConfiguratorDeps = {
	getVisibleSegments(): readonly SegmentName[];
	/** Persists and re-renders. */
	setVisibleSegments(segments: readonly SegmentName[]): void;
	getStatusFilter(): StatusFilter;
	/** Persists and re-renders. */
	setStatusFilter(filter: StatusFilter): void;
	getSegmentColors(): Record<string, string>;
	setSegmentColor(name: string, color: string): void;
	getSegmentOrder(): readonly string[];
	setSegmentOrder(order: string[]): void;
	seenStatusKeys: Set<string>;
	refresh(): void;
};
