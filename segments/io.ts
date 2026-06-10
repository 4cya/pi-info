import { formatTokens } from "../lib/text.js";
import type { SegmentProvider } from "./types.js";

/**
 * I/O Tokens segment: ↑input ↓output
 *
 * Walks all assistant messages in the session to compute cumulative token usage.
 */
const io: SegmentProvider = {
	name: "io",
	label: "I/O Tokens",
	render(ctx) {
		let totalInput = 0;
		let totalOutput = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const usage = entry.message.usage;
				totalInput += usage.input;
				totalOutput += usage.output;
			}
		}
		const parts: string[] = [];
		if (totalInput) parts.push(`↑${formatTokens(totalInput)}`);
		if (totalOutput) parts.push(`↓${formatTokens(totalOutput)}`);
		return parts.length > 0 ? parts.join("  ") : null;
	},
	color: () => "#89b4fa",
};

export default io;
