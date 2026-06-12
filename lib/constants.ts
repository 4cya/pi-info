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

/**
 * Where the statusline is mounted. aboveEditor/belowEditor map to pi's
 * setWidget; editorTop/editorBottom weave the content into the input
 * box's own border rules via a custom editor component.
 */
export const STYLE_POSITIONS = [
	"footer",
	"aboveEditor",
	"belowEditor",
	"editorTop",
	"editorBottom",
] as const;
export type StylePosition = (typeof STYLE_POSITIONS)[number];

export const STYLE_ALIGNS = ["left", "center", "right"] as const;
export type StyleAlign = (typeof STYLE_ALIGNS)[number];

export const STYLE_WIDTHS = ["full", "content"] as const;
export type StyleWidth = (typeof STYLE_WIDTHS)[number];

/** What happens when the content is wider than the terminal. */
export const STYLE_OVERFLOWS = ["truncate", "wrap"] as const;
export type StyleOverflow = (typeof STYLE_OVERFLOWS)[number];

/** "top" draws a single rule above the line instead of a full box. */
export const BORDER_STYLES = ["none", "single", "rounded", "double", "heavy", "ascii", "top"] as const;
export type BorderStyleName = (typeof BORDER_STYLES)[number];

export const DEFAULT_WARNING_THRESHOLD = 70;
export const DEFAULT_ERROR_THRESHOLD = 90;

export const SEGMENT_SEPARATOR = "❯";
export const EXTENSION_STATUS_SEPARATOR = SEGMENT_SEPARATOR;

/** Session entry type used to persist the status filter in session trees. */
export const STATUS_FILTER_ENTRY_TYPE = "pi-info-status-filter";

export function isSegmentName(value: string): value is SegmentName {
	return (ALL_SEGMENTS as readonly string[]).includes(value);
}
