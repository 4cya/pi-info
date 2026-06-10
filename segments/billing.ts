import type { SegmentProvider } from "./types.js";

/**
 * Billing segment: $<totalCost>
 *
 * Accumulates cost from all assistant messages in the session.
 */
const billing: SegmentProvider = {
	name: "billing",
	label: "Cost",
	render(ctx) {
		let total = 0;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				total += entry.message.usage.cost.total;
			}
		}
		return total > 0 ? `$${total.toFixed(3)}` : null;
	},
	color: () => "#fab387",
};

export default billing;
