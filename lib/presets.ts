/**
 * Style presets: named bundles of per-segment format templates plus a
 * separator style, applied in one step via /info preset. Applying a preset
 * replaces the `format` of every segment it covers, clears formats it
 * doesn't, and sets the separator when one is given (empty = back to default).
 *
 * Nerd Font glyphs are written as \uXXXX escapes on purpose — literal PUA
 * characters are too easy for tooling to silently drop.
 */

import type { SeparatorConfig } from "./config.js";

export type Preset = {
	name: string;
	description: string;
	formats: Record<string, string>;
	/** Separator style; {} resets to the default ❯. Omit to leave untouched. */
	separator?: SeparatorConfig;
};

export const PRESETS: Preset[] = [
	{
		name: "plain",
		description: "Text only — the default look",
		formats: {},
		separator: {},
	},
	{
		name: "minimal",
		description: "Default text, no separator — just spacing",
		formats: {},
		separator: { char: "" },
	},
	{
		name: "bars",
		description: "Vertical bar separator — classic statusline",
		formats: {},
		separator: { char: "|" },
	},
	{
		name: "nerd",
		description: "Nerd Font icons + powerline separator (needs a patched font)",
		formats: {
			model: " {name}",
			thinking: " {level}",
			context: " {percent}% · {window}",
			branch: " {branch}",
			billing: " {cost}",
			io: "( {input}  )( {output})",
			cache: " {percent}%",
			cwd: " {dir}",
		},
		separator: { char: "" },
	},
	{
		name: "emoji",
		description: "Emoji prefixes — works everywhere",
		formats: {
			model: "🤖 {name}",
			thinking: "🧠 {level}",
			context: "📊 {percent}% / {window}",
			branch: "🌿 {branch}",
			billing: "💰 ${cost}",
			io: "(⬆{input}  )(⬇{output})",
			cache: "♻️ {percent}%",
			cwd: "📁 {dir}",
		},
		separator: { char: "•" },
	},
];
