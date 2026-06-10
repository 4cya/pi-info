import type { ExtensionContext, ThemeColor } from "@earendil-works/pi-coding-agent";

/**
 * A pi-info footer segment.
 *
 * Each segment exports a SegmentProvider as its default export. pi-info
 * registers built-in providers at startup; other extensions can register
 * their own via `registerSegment`. Use /info to toggle visibility, recolor,
 * reorder, and reformat.
 *
 * Two ways to produce text:
 *
 * 1. `data()` + `defaultFormat` (preferred): expose named variables and a
 *    default template. Users can then restyle the segment via the `format`
 *    config without touching code — see lib/template.ts for the syntax.
 *
 *      const io: SegmentProvider = {
 *        name: "io",
 *        label: "I/O Tokens",
 *        data(ctx) { return { input: "12k", output: "3.4k" }; },
 *        defaultFormat: "(↑{input}  )(↓{output})",
 *      };
 *
 * 2. `render()` (simplest): return the final text. The output is exposed
 *    to format templates as {output}, so users can still wrap it.
 *
 * When both are present, `data()` wins.
 */
export interface SegmentProvider {
	/** Unique segment identifier. Used in /info and config persistence. */
	name: string;
	/** Human-readable label shown in the /info menu. */
	label: string;
	/**
	 * Produce the segment text (or null to hide).
	 * Called on every footer render tick — keep it cheap.
	 */
	render?(ctx: ExtensionContext): string | null;
	/**
	 * Produce named template variables (or null to hide). Rendered through
	 * `defaultFormat` or the user's per-segment `format` override.
	 */
	data?(ctx: ExtensionContext): Record<string, string> | null;
	/** Template used when no user format override is set. Default "{output}". */
	defaultFormat?: string;
	/**
	 * Segment text color. Either a pi theme color or a hex string (#RRGGBB).
	 * Can be static or computed from ctx. Defaults to "dim".
	 * Also resolves the "auto" style token inside format templates.
	 */
	color?: (ctx: ExtensionContext) => ThemeColor | `#${string}`;
}
