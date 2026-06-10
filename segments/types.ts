import type { ExtensionContext, ThemeColor } from "@earendil-works/pi-coding-agent";

/**
 * A pi-statusline footer segment.
 *
 * Each segment exports a SegmentProvider as its default export. pi-statusline
 * registers built-in providers at startup; other extensions can register
 * their own via `registerSegment`. Use /statusline to toggle visibility.
 *
 * Example (./segments/git-branch.ts):
 *   const gitBranch: SegmentProvider = {
 *     name: "git-branch",
 *     label: "Git Branch",
 *     render(ctx) { return getBranch(ctx.cwd); },
 *     color: () => "#89b4fa",
 *   };
 *   export default gitBranch;
 */
export interface SegmentProvider {
	/** Unique segment identifier. Used in /statusline and config persistence. */
	name: string;
	/** Human-readable label shown in the /statusline menu. */
	label: string;
	/**
	 * Produce the segment text (or null to hide).
	 * Called on every footer render tick — keep it cheap.
	 */
	render(ctx: ExtensionContext): string | null;
	/**
	 * Segment text color. Either a pi theme color or a hex string (#RRGGBB).
	 * Can be static or computed from ctx. Defaults to "dim".
	 */
	color?: (ctx: ExtensionContext) => ThemeColor | `#${string}`;
}
