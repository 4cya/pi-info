/**
 * Editor-border embedding: weaves statusline content into the input box's
 * own top/bottom border rules (positions editorTop / editorBottom).
 *
 * pi's editor renders as plain `─` rules above and below the text. We
 * subclass CustomEditor (keeping every default keybinding/behavior) and
 * rewrite those rule lines with content woven in:
 *
 *   ─── claude-opus ❯ 2.6% / 1.0M ───────────────
 *   hello world█
 *   ──────────────────────────────────────────────
 *
 * When the editor replaces a rule with a scroll indicator ("─── ↓ 2 more")
 * that information wins and the embed steps aside for that frame.
 *
 * Note: pi has a single custom-editor slot, so this mode conflicts with
 * other editor-replacing extensions (e.g. vim modes) — last one wins.
 */

import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { StyleAlign } from "./constants.js";

export type EdgeRenderer = (width: number, edge: "top" | "bottom") => string | null;

const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** True for a line that is nothing but a horizontal border rule. */
function isRule(line: string): boolean {
	const text = line.replace(ANSI_RE, "");
	return text.length > 0 && [...text].every((ch) => ch === "─");
}

export class StatuslineEditor extends CustomEditor {
	/** Set by the extension after construction. */
	embed?: EdgeRenderer;

	render(width: number): string[] {
		const lines = super.render(width);
		if (!this.embed || lines.length === 0) return lines;
		if (isRule(lines[0])) {
			const top = this.embed(width, "top");
			if (top) lines[0] = top;
		}
		// Bottom rule: the FIRST rule line after the top — autocomplete rows
		// render after it and may contain rule-like separators of their own,
		// so scanning from the end would corrupt open menus.
		for (let i = 1; i < lines.length; i++) {
			if (!isRule(lines[i])) continue;
			const bottom = this.embed(width, "bottom");
			if (bottom) lines[i] = bottom;
			break;
		}
		return lines;
	}
}

/**
 * Builds a border rule with content woven in. `rule` colors the dashes
 * (the editor's own border color, so the line reads as one piece).
 */
export function composeEdgeLine(
	content: string,
	width: number,
	align: StyleAlign,
	rule: (s: string) => string,
): string {
	// Keep at least "─── " of rule on each side.
	const body = ` ${truncateToWidth(content, Math.max(1, width - 8))} `;
	const slack = Math.max(0, width - visibleWidth(body) - 6);
	const leftExtra = align === "right" ? slack : align === "center" ? Math.floor(slack / 2) : 0;
	return (
		rule("─".repeat(3 + leftExtra)) +
		body +
		rule("─".repeat(3 + slack - leftExtra))
	);
}
