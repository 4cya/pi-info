/**
 * /statusline status — fine-grained filter for extension status keys.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SettingItem } from "@earendil-works/pi-tui";
import { getKnownStatusKeys, shouldShowStatus } from "../status-filter.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

export async function openStatusConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const knownStatusKeys = getKnownStatusKeys(deps.getStatusFilter(), deps.seenStatusKeys);
	if (knownStatusKeys.length === 0) {
		ctx.ui.notify(
			"No extension statuses seen yet. Open /statusline after another extension calls ctx.ui.setStatus().",
			"info",
		);
		return;
	}

	let futureShown = deps.getStatusFilter().mode === "all";
	const statusVisibility = new Map(
		knownStatusKeys.map((key) => [key, shouldShowStatus(key, deps.getStatusFilter())]),
	);
	const persistFromVisibility = () => {
		if (futureShown) {
			deps.setStatusFilter({
				mode: "all",
				hidden: new Set(knownStatusKeys.filter((key) => !statusVisibility.get(key))),
			});
		} else {
			deps.setStatusFilter({
				mode: "only",
				shown: new Set(knownStatusKeys.filter((key) => statusVisibility.get(key))),
			});
		}
	};

	const items: SettingItem[] = [
		{
			id: "__future",
			label: "New statuses",
			description: "Default visibility for status keys discovered later",
			currentValue: futureShown ? "shown" : "hidden",
			values: ["shown", "hidden"],
		},
		...knownStatusKeys.map((key): SettingItem => ({
			id: key,
			label: key,
			description: "Extension status visibility",
			currentValue: statusVisibility.get(key) ? "shown" : "hidden",
			values: ["shown", "hidden"],
		})),
	];

	await openSettingsView(ctx, {
		title: "pi-statusline status visibility",
		subtitle: "Enter/Space toggles · Esc closes",
		items,
		maxRows: 15,
		onChange: (id, newValue) => {
			if (id === "__future") {
				futureShown = newValue === "shown";
			} else {
				statusVisibility.set(id, newValue === "shown");
			}
			persistFromVisibility();
		},
	});
}
