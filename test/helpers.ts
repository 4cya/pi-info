/**
 * Shared test doubles. The fake theme tags fg with dim-style escapes and
 * bg with a fixed 256-color escape so assertions can check exact output.
 */

import type { FooterRenderState } from "../lib/footer.js";

export const theme = {
	fg: (_color: string, text: string) => `\x1b[2m${text}\x1b[0m`,
	bg: (_color: string, text: string) => `\x1b[48;5;236m${text}\x1b[49m`,
	bold: (text: string) => text,
	// biome-ignore lint/suspicious/noExplicitAny: test double
} as any;

export const ctx = {
	getContextUsage: () => ({ percent: 2.6, contextWindow: 1_000_000 }),
	model: { id: "claude-opus-4-7" },
	// biome-ignore lint/suspicious/noExplicitAny: test double
} as any;

export function makeState(overrides: Partial<FooterRenderState> = {}): FooterRenderState {
	return {
		visibleSegments: ["model", "thinking", "context"],
		statusFilter: { mode: "all", hidden: new Set() },
		segmentConfigs: {},
		seenStatusKeys: new Set(),
		warningThreshold: 70,
		errorThreshold: 90,
		thinkingLevel: "med",
		separator: {},
		style: {},
		...overrides,
	};
}

export function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}
