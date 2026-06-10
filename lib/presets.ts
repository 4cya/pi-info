/**
 * Format presets: named bundles of per-segment format templates that can be
 * applied in one step via /info preset. Applying a preset replaces the
 * `format` of every segment it covers and clears formats it doesn't.
 */

export type Preset = {
	name: string;
	description: string;
	formats: Record<string, string>;
};

export const PRESETS: Preset[] = [
	{
		name: "plain",
		description: "Text only — the default look",
		formats: {},
	},
	{
		name: "nerd",
		description: "Nerd Font icons (needs a patched font)",
		formats: {
			model: " {name}",
			thinking: " {level}",
			context: " {percent}% · {window}",
			branch: " {branch}",
			billing: " {cost}",
			io: "( {input}  )( {output})",
			cache: " {percent}%",
			cwd: " {dir}",
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
	},
];
