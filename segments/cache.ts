import type { SegmentProvider } from "./types.js";

/**
 * Cache segment: shows prompt cache hit percentage.
 *
 * Hit rate = cacheRead / (input + cacheRead + cacheWrite) — usage.input
 * excludes cached tokens, so the denominator must add them back.
 * Variables: {percent}
 */
const cache: SegmentProvider = {
	name: "cache",
	label: "Cache",
	data(ctx) {
		let cacheRead = 0;
		let promptTokens = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const usage = entry.message.usage;
				cacheRead += usage.cacheRead;
				promptTokens += usage.input + usage.cacheRead + usage.cacheWrite;
			}
		}
		if (promptTokens === 0) return null;
		return { percent: ((cacheRead / promptTokens) * 100).toFixed(0) };
	},
	defaultFormat: "{percent}%",
	color: () => "#94e2d5",
};

export default cache;
