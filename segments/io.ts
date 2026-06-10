import { formatTokens } from "../lib/text.js";
import type { SegmentProvider } from "./types.js";

/**
 * I/O Tokens segment: ↑input ↓output
 *
 * Walks all assistant messages in the session to compute cumulative token usage.
 * Variables: {input} {output} {total} — input/output are empty when zero.
 */
const io: SegmentProvider = {
	name: "io",
	label: "I/O Tokens",
	data(ctx) {
		let totalInput = 0;
		let totalOutput = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const usage = entry.message.usage;
				totalInput += usage.input;
				totalOutput += usage.output;
			}
		}
		if (totalInput === 0 && totalOutput === 0) return null;
		return {
			input: totalInput ? formatTokens(totalInput) : "",
			output: totalOutput ? formatTokens(totalOutput) : "",
			total: formatTokens(totalInput + totalOutput),
		};
	},
	defaultFormat: "(↑{input}  )(↓{output})",
	color: () => "#89b4fa",
};

export default io;
