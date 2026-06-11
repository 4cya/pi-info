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
	/**
	 * Per-segment color/bg overrides. Applying any preset clears `bg` on
	 * segments not listed here; `color` is only touched for listed segments.
	 */
	colors?: Record<string, { color?: string; bg?: string }>;
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
		name: "powerline",
		description: "Colored blocks with arrow transitions (needs a patched font)",
		formats: {
			model: "\ue26d {name}",
			thinking: "\udb85\udc02 {level}",
			context: "\uf4bc {percent}%",
			branch: "\ue0a0 {branch}",
			billing: "\uf155{cost}",
			io: "(\uf062 {input}  )(\uf063 {output})",
			cache: "\uf1c0 {percent}%",
			cwd: "\uf07b {dir}",
		},
		separator: { char: "\ue0b0", mode: "powerline" },
		colors: {
			model: { bg: "#8aadf4", color: "#1e2030" },
			thinking: { bg: "#c6a0f6", color: "#1e2030" },
			context: { bg: "#494d64" },
			branch: { bg: "#a6da95", color: "#1e2030" },
			billing: { bg: "#eed49f", color: "#1e2030" },
			io: { bg: "#363a4f", color: "#cad3f5" },
			cache: { bg: "#363a4f", color: "#cad3f5" },
			cwd: { bg: "#363a4f", color: "#cad3f5" },
			extensions: { bg: "#24273a", color: "#cad3f5" },
		},
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
