/**
 * /info segments — per segment: visibility plus which bar it renders in
 * (shown = the global bar from /info style; above/below/footer pin it,
 * splitting the statusline into multiple bars). Also covers registered
 * dynamic segments and (when present) individual extension statuses.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SettingItem } from "@earendil-works/pi-tui";
import {
	ALL_SEGMENTS,
	isSegmentName,
	SEGMENT_LABELS,
	type SegmentName,
} from "../constants.js";
import { registeredSegments, visibleDynamic } from "../registry.js";
import { getKnownStatusKeys, shouldShowStatus } from "../status-filter.js";
import type { StylePosition } from "../constants.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

// Value shown in the list ↔ segment placement. "shown" follows the global
// bar; the rest pin the segment to a specific bar. edge-top/edge-bottom
// weave the segment into the input box's border rules.
const PLACEMENT_VALUES = [
	"shown", "above", "below", "footer", "edge-top", "edge-bottom", "hidden",
] as const;
type PlacementValue = (typeof PLACEMENT_VALUES)[number];

const VALUE_TO_POSITION: Record<string, StylePosition> = {
	above: "aboveEditor",
	below: "belowEditor",
	footer: "footer",
	"edge-top": "editorTop",
	"edge-bottom": "editorBottom",
};

const POSITION_TO_VALUE: Record<StylePosition, PlacementValue> = {
	footer: "footer",
	aboveEditor: "above",
	belowEditor: "below",
	editorTop: "edge-top",
	editorBottom: "edge-bottom",
};

function placementOf(visible: boolean, position: StylePosition | undefined): PlacementValue {
	if (!visible) return "hidden";
	return position ? POSITION_TO_VALUE[position] : "shown";
}

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

	const configs = deps.getSegmentConfigs();
	const placementDescription =
		"shown = the global bar; above/below/footer pin it; edge-top/edge-bottom weave it into the input box border";
	const segmentItems: SettingItem[] = [
		...ALL_SEGMENTS.map((segment): SettingItem => ({
			id: `segment:${segment}`,
			label: SEGMENT_LABELS[segment],
			description: placementDescription,
			currentValue: placementOf(
				segmentVisibility.get(segment) ?? false,
				configs[segment]?.position,
			),
			values: [...PLACEMENT_VALUES],
		})),
		...Array.from(registeredSegments.entries()).map(([name, provider]): SettingItem => ({
			id: `dyn-segment:${name}`,
			label: provider.label,
			description: placementDescription,
			currentValue: placementOf(dynVisibility.get(name) ?? false, configs[name]?.position),
			values: [...PLACEMENT_VALUES],
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
				const visible = newValue !== "hidden";
				segmentVisibility.set(segment, visible);
				persistSegmentsFromVisibility();
				if (visible) {
					deps.updateSegmentConfig(segment, { position: VALUE_TO_POSITION[newValue] });
				}
				return;
			}

			if (id.startsWith("dyn-segment:")) {
				const name = id.slice("dyn-segment:".length);
				const visible = newValue !== "hidden";
				dynVisibility.set(name, visible);
				// updateSegmentConfig syncs visibleDynamic from the config.
				deps.updateSegmentConfig(name, {
					hidden: visible ? undefined : true,
					...(visible ? { position: VALUE_TO_POSITION[newValue] } : {}),
				});
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
