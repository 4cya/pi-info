import type { SegmentProvider } from "./types.js";

/**
 * Billing segment: $<totalCost>
 *
 * Accumulates cost from all assistant messages in the session.
 * Variables: {cost}
 */
const billing: SegmentProvider = {
	name: "billing",
	label: "Cost",
	data(ctx) {
		let total = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				total += entry.message.usage.cost.total;
			}
		}
		return total > 0 ? { cost: total.toFixed(3) } : null;
	},
	defaultFormat: "${cost}",
	color: () => "#fab387",
};

export default billing;
