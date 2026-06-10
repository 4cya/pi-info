/**
 * /info order — reorder segment display. Space cycles move up/down;
 * Enter opens an inline input to type a target position directly.
 *
 * The view closes after each move because SettingsList labels (which embed
 * the position numbers) cannot update in place.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { ALL_SEGMENTS, SEGMENT_LABELS } from "../constants.js";
import { registeredSegments } from "../registry.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

export async function openOrderConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const allKeys = [...ALL_SEGMENTS, ...registeredSegments.keys()];
	const savedOrder = deps.getSegmentOrder();
	const currentOrder = savedOrder.length > 0 ? savedOrder : allKeys;
	// Show segments not yet in the saved order at the end.
	const ordered = [
		...currentOrder.filter((key) => allKeys.includes(key)),
		...allKeys.filter((key) => !currentOrder.includes(key)),
	];

	const labelMap = new Map<string, string>();
	for (const segment of ALL_SEGMENTS) labelMap.set(segment, SEGMENT_LABELS[segment]);
	for (const [name, provider] of registeredSegments) labelMap.set(name, provider.label);

	const moveTo = (name: string, targetIndex: number) => {
		const from = ordered.indexOf(name);
		if (from === -1 || targetIndex < 0 || targetIndex >= ordered.length || from === targetIndex) {
			return false;
		}
		ordered.splice(from, 1);
		ordered.splice(targetIndex, 0, name);
		deps.setSegmentOrder([...ordered]);
		return true;
	};

	const items: SettingItem[] = ordered.map((name, idx) => ({
		id: `order:${name}`,
		label: `${idx + 1}. ${labelMap.get(name) ?? name}`,
		description: `Position ${idx + 1} of ${ordered.length}`,
		currentValue: "move up",
		values: ["move up", "move down"],
		submenu: (currentValue: string, done: (value?: string) => void) => {
			const input = new Input();
			input.setValue(currentValue);
			input.onSubmit = (value: string) => {
				const pos = parseInt(value, 10);
				if (!Number.isFinite(pos) || pos < 1 || pos > ordered.length) {
					ctx.ui.notify(`Invalid position "${value}". Enter 1-${ordered.length}.`, "warning");
					return;
				}
				done(String(pos));
			};
			input.onEscape = () => done();
			return input;
		},
	}));

	await openSettingsView(ctx, {
		title: "Segment order",
		subtitle: "Space cycles move up/down · Enter opens inline input · Esc closes",
		items,
		onChange: (id, newValue) => {
			if (!id.startsWith("order:")) return;
			const name = id.slice("order:".length);
			const idx = ordered.indexOf(name);
			let moved = false;
			if (newValue === "move up") moved = moveTo(name, idx - 1);
			else if (newValue === "move down") moved = moveTo(name, idx + 1);
			else {
				const pos = parseInt(newValue, 10);
				if (Number.isFinite(pos)) moved = moveTo(name, pos - 1);
			}
			return moved ? "close" : undefined;
		},
	});
}
