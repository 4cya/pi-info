import type { SegmentProvider } from "./types.js";

/**
 * Cache segment: shows prompt cache hit percentage.
 *
 * Accumulates cache-read and total-input tokens across messages,
 * then displays the hit rate as a percentage.
 * Variables: {percent}
 */
const cache: SegmentProvider = {
	name: "cache",
	label: "Cache",
	data(ctx) {
		let cacheRead = 0;
		let inputTokens = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const usage = entry.message.usage;
				cacheRead += usage.cacheRead;
				inputTokens += usage.input;
			}
		}
		if (inputTokens === 0) return null;
		return { percent: ((cacheRead / inputTokens) * 100).toFixed(0) };
	},
	defaultFormat: "{percent}%",
	color: () => "#94e2d5",
};

export default cache;
