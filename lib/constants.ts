/**
 * Shared constants: segment names, labels, defaults, separators.
 */

export type SegmentName = "model" | "thinking" | "context" | "extensions";

export const ALL_SEGMENTS: readonly SegmentName[] = [
	"model",
	"thinking",
	"context",
	"extensions",
];

export const DEFAULT_SEGMENTS: SegmentName[] = [...ALL_SEGMENTS];

export const SEGMENT_LABELS: Record<SegmentName, string> = {
	model: "Model",
	thinking: "Thinking level",
	context: "Context usage",
	extensions: "Extension statuses",
};

export const DEFAULT_WARNING_THRESHOLD = 70;
export const DEFAULT_ERROR_THRESHOLD = 90;

export const SEGMENT_SEPARATOR = "❯";
export const EXTENSION_STATUS_SEPARATOR = SEGMENT_SEPARATOR;

/** Session entry type used to persist the status filter in session trees. */
export const STATUS_FILTER_ENTRY_TYPE = "pi-statusline-status-filter";

export function isSegmentName(value: string): value is SegmentName {
	return (ALL_SEGMENTS as readonly string[]).includes(value);
}
