/**
 * Color helpers: theme-color validation, hex/theme application, and the
 * built-in thinking/context color mappings.
 */

import type { ThemeColor } from "@earendil-works/pi-coding-agent";

/** Known pi theme color names (lowercase). */
export const VALID_THEME_COLORS = new Set([
	"accent", "border", "borderAccent", "borderMuted",
	"success", "error", "warning", "muted", "dim", "text",
	"thinkingText", "thinkingOff", "thinkingMinimal", "thinkingLow",
	"thinkingMedium", "thinkingHigh", "thinkingXhigh", "bashMode",
	"userMessageText", "customMessageText", "customMessageLabel",
	"toolTitle", "toolOutput",
	"mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock",
	"mdCodeBlockBorder", "mdQuote", "mdQuoteBorder", "mdHr", "mdListBullet",
	"toolDiffAdded", "toolDiffRemoved", "toolDiffContext",
	"syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable",
	"syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
]);

export function isValidHex(s: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(s);
}

export function isValidColor(s: string): boolean {
	return isValidHex(s) || VALID_THEME_COLORS.has(s.toLowerCase());
}

/** Applies a ThemeColor or hex (#RRGGBB) to text using ANSI escapes. */
export function applyColor(
	color: string,
	theme: { fg: (c: ThemeColor, t: string) => string },
	text: string,
): string {
	if (color.startsWith("#")) {
		const hex = color.replace(/^#/, "");
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
	}
	// Non-hex colors are validated against VALID_THEME_COLORS upstream.
	return theme.fg(color as ThemeColor, text);
}

export function thinkingColor(level: string): ThemeColor {
	switch (level) {
		case "off":
			return "thinkingOff";
		case "minimal":
		case "min":
			return "thinkingMinimal";
		case "low":
			return "thinkingLow";
		case "medium":
		case "med":
			return "thinkingMedium";
		case "high":
			return "thinkingHigh";
		case "xhigh":
		case "extra-high":
			return "thinkingXhigh";
		default:
			return "thinkingText";
	}
}

export function contextColor(
	percent: number | null | undefined,
	warningThreshold: number,
	errorThreshold: number,
): ThemeColor {
	if (percent === null || percent === undefined) return "muted";
	if (percent >= errorThreshold) return "error";
	if (percent >= warningThreshold) return "warning";
	return "success";
}
