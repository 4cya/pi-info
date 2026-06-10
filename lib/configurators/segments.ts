/**
 * /info segments — toggle visibility of built-in segments, registered
 * dynamic segments, and (when present) individual extension statuses.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SettingItem } from "@earendil-works/pi-tui";
import { writeGlobalConfig } from "../config.js";
import {
	ALL_SEGMENTS,
	isSegmentName,
	SEGMENT_LABELS,
	type SegmentName,
} from "../constants.js";
import { registeredSegments, visibleDynamic } from "../registry.js";
import { getKnownStatusKeys, shouldShowStatus } from "../status-filter.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

export async function openSegmentConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const knownStatusKeys = getKnownStatusKeys(deps.getStatusFilter(), deps.seenStatusKeys);
	const visibleSegments = deps.getVisibleSegments();
	const segmentVisibility = new Map(
		ALL_SEGMENTS.map(
			(segment): [SegmentName, boolean] => [segment, visibleSegments.includes(segment)],
		),
	);
	const dynVisibility = new Map<string, boolean>();
	for (const [name] of registeredSegments) {
		dynVisibility.set(name, visibleDynamic.has(name));
	}
	let futureShown = deps.getStatusFilter().mode === "all";
	const statusVisibility = new Map(
		knownStatusKeys.map((key): [string, boolean] => [
			key,
			shouldShowStatus(key, deps.getStatusFilter()),
		]),
	);

	const persistSegmentsFromVisibility = () => {
		deps.setVisibleSegments(ALL_SEGMENTS.filter((segment) => segmentVisibility.get(segment)));
	};
	const persistDynamicSegments = () => {
		writeGlobalConfig({ dynamicSegments: Array.from(visibleDynamic) });
		deps.refresh();
	};
	const persistStatusesFromVisibility = () => {
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

	const segmentItems: SettingItem[] = [
		...ALL_SEGMENTS.map((segment): SettingItem => ({
			id: `segment:${segment}`,
			label: SEGMENT_LABELS[segment],
			description: "Footer segment visibility",
			currentValue: segmentVisibility.get(segment) ? "shown" : "hidden",
			values: ["shown", "hidden"],
		})),
		...Array.from(registeredSegments.entries()).map(([name, provider]): SettingItem => ({
			id: `dyn-segment:${name}`,
			label: provider.label,
			description: "Registered footer segment",
			currentValue: dynVisibility.get(name) ? "shown" : "hidden",
			values: ["shown", "hidden"],
		})),
	];
	const statusItems: SettingItem[] = knownStatusKeys.length > 0
		? [
			{
				id: "status:__future",
				label: "New extension statuses",
				description: "Default visibility for status keys discovered later",
				currentValue: futureShown ? "shown" : "hidden",
				values: ["shown", "hidden"],
			},
			...knownStatusKeys.map((key): SettingItem => ({
				id: `status:${key}`,
				label: `Status: ${key}`,
				description: "Extension status visibility",
				currentValue: statusVisibility.get(key) ? "shown" : "hidden",
				values: ["shown", "hidden"],
			})),
		]
		: [];

	await openSettingsView(ctx, {
		title: "pi-info visibility",
		subtitle:
			knownStatusKeys.length > 0
				? "Footer segments + extension statuses · Enter/Space toggles · Esc closes"
				: "Footer segments · no extension statuses seen yet · Esc closes",
		items: [...segmentItems, ...statusItems],
		onChange: (id, newValue) => {
			if (id.startsWith("segment:")) {
				const segment = id.slice("segment:".length);
				if (!isSegmentName(segment)) return;
				segmentVisibility.set(segment, newValue === "shown");
				persistSegmentsFromVisibility();
				return;
			}

			if (id.startsWith("dyn-segment:")) {
				const name = id.slice("dyn-segment:".length);
				dynVisibility.set(name, newValue === "shown");
				if (newValue === "shown") visibleDynamic.add(name);
				else visibleDynamic.delete(name);
				persistDynamicSegments();
				return;
			}

			if (id === "status:__future") {
				futureShown = newValue === "shown";
				persistStatusesFromVisibility();
				return;
			}

			if (id.startsWith("status:")) {
				statusVisibility.set(id.slice("status:".length), newValue === "shown");
				persistStatusesFromVisibility();
			}
		},
	});
}
