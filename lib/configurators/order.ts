/**
 * /info order — assign numeric priorities to segments. Lower = earlier in
 * the footer line. Enter types a new priority number directly.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { ALL_SEGMENTS, SEGMENT_LABELS } from "../constants.js";
import { registeredSegments, visibleDynamic } from "../registry.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

export async function openOrderConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	// Only list segments that are currently visible.
	const visibleBuiltin = deps.getVisibleSegments();
	const visibleDynamicNames = [...registeredSegments.keys()].filter((name) => visibleDynamic.has(name));
	const allKeys = [...visibleBuiltin, ...visibleDynamicNames];
	const configs = deps.getSegmentConfigs();
	const savedOrder: Record<string, number> = {};
	for (const key of allKeys) {
		const order = configs[key]?.order;
		if (order !== undefined) savedOrder[key] = order;
	}

	const labelMap = new Map<string, string>();
	for (const segment of ALL_SEGMENTS) labelMap.set(segment, SEGMENT_LABELS[segment]);
	for (const [name, provider] of registeredSegments) labelMap.set(name, provider.label);

	// Sort by priority, then alphabetically for ties.
	const sorted = [...allKeys].sort((a, b) => {
		const pa = savedOrder[a] ?? 999;
		const pb = savedOrder[b] ?? 999;
		if (pa !== pb) return pa - pb;
		return (labelMap.get(a) ?? a).localeCompare(labelMap.get(b) ?? b);
	});

	const items: SettingItem[] = sorted.map((name, idx) => {
		const priority = savedOrder[name] ?? 999;
		return {
			id: `order:${name}`,
			label: `${labelMap.get(name) ?? name}`,
			description: `Priority ${priority} · enter a new number`,
			currentValue: `${priority}`,
			values: [],
			submenu: (_currentValue: string, done: (value?: string) => void) => {
				const input = new Input();
				input.setValue(`${priority}`);
				input.onSubmit = (value: string) => {
					const num = parseInt(value, 10);
					if (!Number.isFinite(num)) {
						ctx.ui.notify(`Invalid number "${value}".`, "warning");
						return;
					}
					done(`${num}`);
				};
				input.onEscape = () => done();
				return input;
			},
		};
	});

	await openSettingsView(ctx, {
		title: "Segment order",
		subtitle: "Enter to type priority number · lower = earlier · Esc closes",
		items,
		onChange: (id, newValue) => {
			if (!id.startsWith("order:")) return;
			const name = id.slice("order:".length);
			const num = parseInt(newValue, 10);
			if (!Number.isFinite(num)) {
				ctx.ui.notify(`Invalid priority "${newValue}".`, "warning");
				return;
			}
			// The default (999) is stored as "no override" to keep config lean.
			deps.updateSegmentConfig(name, { order: num === 999 ? undefined : num });
		},
	});
}
