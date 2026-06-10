/**
 * pi-info — footer / info bar extension.
 *
 * Replaces pi's built-in footer with left-aligned segments:
 *   <model> ❯ think:<level> ❯ <context% / window> ❯ <extensions> ❯ <dynamic…>
 *
 * Example:
 *   claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k
 *
 * Re-renders on model change, thinking-level change, status updates, and after
 * each assistant turn so context usage stays current.
 *
 * Module layout:
 *   lib/constants.ts       segment names, labels, defaults
 *   lib/config.ts          persisted config + env parsing
 *   lib/footer.ts          footer line rendering
 *   lib/registry.ts        dynamic segment registry (public registerSegment API)
 *   lib/configurators/     /statusline TUI configurators
 *   segments/              SegmentProvider interface + built-in providers
 *
 * Environment variables:
 *   PI_INFO_SHOW        comma-separated list of segments to show
 *   PI_INFO_THRESHOLDS  warning,danger context-usage percentages
 *   PI_INFO_CONFIG      override the persisted config path
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { openColorConfigurator } from "../lib/configurators/colors.js";
import type { ConfiguratorDeps } from "../lib/configurators/deps.js";
import { openOrderConfigurator } from "../lib/configurators/order.js";
import { openSegmentConfigurator } from "../lib/configurators/segments.js";
import { openStatusConfigurator } from "../lib/configurators/status.js";
import {
	parseThresholds,
	readGlobalConfig,
	readGlobalSegments,
	serializeSegments,
	writeGlobalConfig,
} from "../lib/config.js";
import {
	DEFAULT_SEGMENTS,
	SEGMENT_LABELS,
	STATUS_FILTER_ENTRY_TYPE,
	type SegmentName,
} from "../lib/constants.js";
import { renderFooterLine } from "../lib/footer.js";
import { registeredSegments, visibleDynamic } from "../lib/registry.js";
import {
	parseSerializedStatusFilter,
	serializeStatusFilter,
	type StatusFilter,
} from "../lib/status-filter.js";

// Public API for other extensions: register custom footer segments.
export { registerSegment, unregisterSegment } from "../lib/registry.js";
export type { SegmentProvider } from "../segments/types.js";

function describeSegments(segments: readonly SegmentName[]): string {
	const parts = segments.map((segment) => SEGMENT_LABELS[segment]);
	for (const [name, provider] of registeredSegments) {
		if (visibleDynamic.has(name)) parts.push(provider.label);
	}
	if (parts.length === 0) return "showing none";
	return `showing: ${parts.join(", ")}`;
}

export default function (pi: ExtensionAPI) {
	let requestRender: (() => void) | undefined;
	let statusFilter: StatusFilter = { mode: "all", hidden: new Set() };
	let visibleSegments: SegmentName[] = readGlobalSegments() ?? DEFAULT_SEGMENTS;

	const initialConfig = readGlobalConfig();
	if (initialConfig.dynamicSegments) {
		visibleDynamic.clear();
		for (const name of initialConfig.dynamicSegments) visibleDynamic.add(name);
	}
	const segmentColors: Record<string, string> = initialConfig.segmentColors ?? {};
	let segmentOrder: string[] = initialConfig.segmentOrder ?? [];

	const seenStatusKeys = new Set<string>();
	const refresh = () => requestRender?.();

	const restoreStatusFilter = (ctx: ExtensionContext) => {
		let restoredFilter = parseSerializedStatusFilter(readGlobalConfig().statusFilter);
		if (!restoredFilter) {
			for (const entry of ctx.sessionManager.getBranch()) {
				if (entry.type === "custom" && entry.customType === STATUS_FILTER_ENTRY_TYPE) {
					restoredFilter = parseSerializedStatusFilter(entry.data);
				}
			}
		}
		statusFilter = restoredFilter ?? { mode: "all", hidden: new Set() };
	};

	const deps: ConfiguratorDeps = {
		getVisibleSegments: () => visibleSegments,
		setVisibleSegments: (segments) => {
			visibleSegments = serializeSegments(segments);
			writeGlobalConfig({ segments: visibleSegments });
			refresh();
		},
		getStatusFilter: () => statusFilter,
		setStatusFilter: (filter) => {
			statusFilter = filter;
			writeGlobalConfig({ statusFilter: serializeStatusFilter(filter) });
			refresh();
		},
		getSegmentColors: () => segmentColors,
		setSegmentColor: (name, color) => {
			segmentColors[name] = color;
			writeGlobalConfig({ segmentColors: { ...segmentColors } });
			refresh();
		},
		getSegmentOrder: () => segmentOrder,
		setSegmentOrder: (order) => {
			segmentOrder = order;
			writeGlobalConfig({ segmentOrder: order });
			refresh();
		},
		seenStatusKeys,
		refresh,
	};

	pi.registerCommand("info", {
		description: "Configure the pi-info footer",
		getArgumentCompletions(prefix: string) {
			const word = prefix.trim().split(/\s+/).filter(Boolean).pop() ?? "";
			const items = ["segments", "status", "color", "order", "list"];
			return items
				.filter((item) => item.startsWith(word))
				.map((item) => ({ value: item, label: item }));
		},
		handler: async (args, ctx) => {
			// Route known subcommands directly, fall back to a select menu.
			const direct = args.trim().split(/\s+/)[0].toLowerCase();
			const route = async (key: string): Promise<boolean> => {
				switch (key) {
					case "segments":
						await openSegmentConfigurator(ctx, deps);
						return true;
					case "status":
						await openStatusConfigurator(ctx, deps);
						return true;
					case "color":
					case "colors":
						await openColorConfigurator(ctx, deps);
						return true;
					case "order":
						await openOrderConfigurator(ctx, deps);
						return true;
					case "list":
					case "ls":
						ctx.ui.notify(
							`pi-info footer: ${describeSegments(visibleSegments)}`,
							"info",
						);
						return true;
					default:
						return false;
				}
			};

			if (await route(direct)) return;

			const choice = await ctx.ui.select("pi-info", [
				"segments — show/hide footer segments",
				"status   — filter extension statuses",
				"color    — change segment colors",
				"order    — reorder segment display",
				"list     — show current config",
			]);
			if (!choice) return;
			await route(choice.split(/\s+—/)[0].trim());
		},
	});

	pi.on("model_select", async () => refresh());
	pi.on("thinking_level_select", async () => refresh());
	pi.on("turn_end", async () => refresh());
	pi.on("message_end", async () => refresh());
	pi.on("session_tree", async (_event, ctx) => {
		restoreStatusFilter(ctx);
		refresh();
	});

	pi.on("session_start", async (_event, ctx) => {
		visibleSegments = readGlobalSegments() ?? DEFAULT_SEGMENTS;
		restoreStatusFilter(ctx);

		if (!ctx.hasUI) return;

		const { warningThreshold, errorThreshold } = parseThresholds();

		ctx.ui.setFooter((tui, theme, footerData) => {
			requestRender = () => tui.requestRender();

			return {
				dispose() {
					requestRender = undefined;
				},
				invalidate() {},
				render(width: number): string[] {
					return [
						renderFooterLine(
							ctx,
							theme,
							width,
							{
								visibleSegments,
								statusFilter,
								segmentColors,
								segmentOrder,
								seenStatusKeys,
								warningThreshold,
								errorThreshold,
								thinkingLevel: String(pi.getThinkingLevel()),
							},
							footerData?.getExtensionStatuses?.() ?? new Map(),
						),
					];
				},
			};
		});
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (ctx.hasUI) ctx.ui.setFooter(undefined);
	});
}
