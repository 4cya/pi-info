import { formatTokens } from "../lib/text.js";
import type { SegmentProvider } from "./types.js";

/**
 * Cache segment: R<cacheRead> W<cacheWrite>
 *
 * Shows prompt cache hit metrics from all assistant messages.
 */
const cache: SegmentProvider = {
	name: "cache",
	label: "Cache",
	render(ctx) {
		let totalRead = 0;
		let totalWrite = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const usage = entry.message.usage;
				totalRead += usage.cacheRead;
				totalWrite += usage.cacheWrite;
			}
		}
		const parts: string[] = [];
		if (totalRead) parts.push(`R${formatTokens(totalRead)}`);
		if (totalWrite) parts.push(`W${formatTokens(totalWrite)}`);
		return parts.length > 0 ? parts.join("  ") : null;
	},
	color: () => "#94e2d5",
};

export default cache;
