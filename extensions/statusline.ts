/**
 * pi-info — footer / info bar extension.
 *
 * Replaces pi's built-in footer with left-aligned segments:
 *   <model> ❯ think:<level> ❯ <context% / window> ❯ <extensions> ❯ <dynamic…>
 *
 * Example:
 *   claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k
 *
 * Every segment renders through a format template ({var} interpolation,
 * [text](style) spans, (optional groups)) that users can override per
 * segment — see lib/template.ts. Re-renders on model change, thinking-level
 * change, status updates, and after each assistant turn.
 *
 * Module layout:
 *   lib/constants.ts       segment names, labels, defaults
 *   lib/config.ts          persisted per-segment config + env parsing
 *   lib/template.ts        format template engine
 *   lib/footer.ts          footer line rendering
 *   lib/style.ts           container styling (position, border, background)
 *   lib/presets.ts         one-step format presets
 *   lib/registry.ts        dynamic segment registry (public registerSegment API)
 *   lib/configurators/     /info TUI configurators
 *   segments/              SegmentProvider interface + built-in providers
 *
 * Environment variables:
 *   PI_INFO_SHOW        comma-separated list of segments to show
 *   PI_INFO_THRESHOLDS  warning,danger context-usage percentages
 *   PI_INFO_CONFIG      override the persisted config path
 */

import type {
	ExtensionAPI,
	ExtensionContext,
	ReadonlyFooterDataProvider,
} from "@earendil-works/pi-coding-agent";
import { openColorConfigurator } from "../lib/configurators/colors.js";
import type { ConfiguratorDeps } from "../lib/configurators/deps.js";
import { openFormatConfigurator } from "../lib/configurators/format.js";
import { openOrderConfigurator } from "../lib/configurators/order.js";
import { openSegmentConfigurator } from "../lib/configurators/segments.js";
import { openSeparatorConfigurator } from "../lib/configurators/separator.js";
import { openStyleConfigurator } from "../lib/configurators/style.js";
import {
	applySegmentPatch,
	applyStylePatch,
	parseThresholds,
	readGlobalConfig,
	readGlobalSegments,
	serializeSegments,
	writeGlobalConfig,
	type SegmentConfig,
	type SeparatorConfig,
	type StyleConfig,
} from "../lib/config.js";
import {
	ALL_SEGMENTS,
	DEFAULT_SEGMENTS,
	SEGMENT_SEPARATOR,
	STATUS_FILTER_ENTRY_TYPE,
	type SegmentName,
	type StylePosition,
} from "../lib/constants.js";
import { animatedUsed, beginEffectTracking } from "../lib/effects.js";
import { renderFooterLines, type FooterRenderState } from "../lib/footer.js";
import { PRESETS, type Preset } from "../lib/presets.js";
import { registeredSegments, registerSegment, visibleDynamic } from "../lib/registry.js";
import {
	parseSerializedStatusFilter,
	serializeStatusFilter,
	type StatusFilter,
} from "../lib/status-filter.js";
import { createCustomSegment } from "../segments/custom.js";

// Public API for other extensions: register custom footer segments and
// text effects.
export { registerSegment, unregisterSegment } from "../lib/registry.js";
export { registerEffect, unregisterEffect } from "../lib/effects.js";
export type { TextEffect } from "../lib/effects.js";
export type { SegmentProvider } from "../segments/types.js";

export default function (pi: ExtensionAPI) {
	let requestRender: (() => void) | undefined;
	let statusFilter: StatusFilter = { mode: "all", hidden: new Set() };
	let segmentConfigs: Record<string, SegmentConfig> = {};
	let separatorConfig: SeparatorConfig = {};
	let styleConfig: StyleConfig = {};
	let visibleSegments: SegmentName[] = DEFAULT_SEGMENTS;
	let thresholds = parseThresholds();
	// Set by mountUI on session_start; needed to remount when the position changes.
	let uiCtx: ExtensionContext | undefined;
	let footerDataRef: ReadonlyFooterDataProvider | undefined;
	let mountedPositions = new Set<StylePosition>();

	const seenStatusKeys = new Set<string>();
	const refresh = () => requestRender?.();

	// Registry visibility follows the config: hidden entries are removed,
	// everything else (including unconfigured segments) is visible.
	const syncDynamicVisibility = () => {
		for (const [name] of registeredSegments) {
			if (segmentConfigs[name]?.hidden) visibleDynamic.delete(name);
			else visibleDynamic.add(name);
		}
	};

	// Config entries with a `command` are shell-command segments.
	const registerCustomSegments = () => {
		for (const [name, cfg] of Object.entries(segmentConfigs)) {
			if (!cfg.command) continue;
			try {
				registerSegment(createCustomSegment(name, cfg));
			} catch {
				// Skip broken custom segments.
			}
		}
	};

	const loadConfig = () => {
		const config = readGlobalConfig();
		segmentConfigs = config.segments ?? {};
		separatorConfig = config.separator ?? {};
		styleConfig = config.style ?? {};
		visibleSegments = readGlobalSegments() ?? DEFAULT_SEGMENTS;
		registerCustomSegments();
		syncDynamicVisibility();
	};
	loadConfig();

	const renderState = (): FooterRenderState => ({
		visibleSegments,
		statusFilter,
		segmentConfigs,
		seenStatusKeys,
		warningThreshold: thresholds.warningThreshold,
		errorThreshold: thresholds.errorThreshold,
		thinkingLevel: String(pi.getThinkingLevel()),
		separator: separatorConfig,
		style: styleConfig,
	});

	// Animated effects need periodic re-renders. Each bar reports whether
	// its last render used one; the ticker runs only while any did, so
	// static configs cost nothing.
	let ticker: ReturnType<typeof setInterval> | undefined;
	let tickerInterval = 0;
	const animatedByBar = new Map<string, number | null>();
	const stopTicker = () => {
		if (ticker) clearInterval(ticker);
		ticker = undefined;
		tickerInterval = 0;
	};
	const syncTicker = () => {
		const intervals = [...animatedByBar.values()].filter((ms): ms is number => ms !== null);
		if (intervals.length === 0) {
			stopTicker();
			return;
		}
		const interval = Math.min(...intervals);
		if (ticker && tickerInterval === interval) return;
		stopTicker();
		tickerInterval = interval;
		ticker = setInterval(() => requestRender?.(), tickerInterval);
	};

	/** Render + ticker bookkeeping; shared by all bar mounts. */
	const renderLines = (
		ctx: ExtensionContext,
		theme: Parameters<typeof renderFooterLines>[1],
		width: number,
		statuses: ReadonlyMap<string, string>,
		position: StylePosition,
	): string[] => {
		beginEffectTracking();
		const lines = renderFooterLines(ctx, theme, width, renderState(), statuses, position);
		animatedByBar.set(position, animatedUsed()?.intervalMs ?? null);
		syncTicker();
		return lines;
	};

	/** Bars referenced by the global position or any per-segment override. */
	const positionsInUse = (): Set<StylePosition> => {
		const positions = new Set<StylePosition>([styleConfig.position ?? "footer"]);
		for (const cfg of Object.values(segmentConfigs)) {
			if (cfg.position && !cfg.hidden) positions.add(cfg.position);
		}
		return positions;
	};

	/**
	 * Mounts one bar per position in use (global style.position plus any
	 * per-segment overrides). The footer slot is always claimed: it either
	 * renders the footer bar or renders nothing — hiding pi's built-in
	 * footer (the statusline replaces it) while keeping access to extension
	 * statuses, which only the footer factory receives.
	 */
	const mountUI = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;
		uiCtx = ctx;
		const positions = positionsInUse();
		mountedPositions = positions;
		animatedByBar.clear();

		ctx.ui.setFooter((tui, theme, footerData) => {
			footerDataRef = footerData;
			requestRender = () => tui.requestRender();
			return {
				dispose() {
					requestRender = undefined;
				},
				invalidate() {},
				render(width: number): string[] {
					if (!positions.has("footer")) return [];
					return renderLines(
						ctx,
						theme,
						width,
						footerData?.getExtensionStatuses?.() ?? new Map(),
						"footer",
					);
				},
			};
		});

		for (const placement of ["aboveEditor", "belowEditor"] as const) {
			const key = `pi-info:${placement}`;
			if (!positions.has(placement)) {
				ctx.ui.setWidget(key, undefined);
				continue;
			}
			ctx.ui.setWidget(
				key,
				(tui, theme) => {
					requestRender = () => tui.requestRender();
					return {
						invalidate() {},
						render(width: number): string[] {
							return renderLines(
								ctx,
								theme,
								width,
								footerDataRef?.getExtensionStatuses?.() ?? new Map(),
								placement,
							);
						},
					};
				},
				{ placement },
			);
		}
	};

	const persistSegments = () => {
		writeGlobalConfig({ segments: segmentConfigs });
		syncDynamicVisibility();
		// Showing/hiding/moving segments can change which bars exist.
		if (uiCtx) {
			const needed = positionsInUse();
			const changed =
				needed.size !== mountedPositions.size ||
				[...needed].some((p) => !mountedPositions.has(p));
			if (changed) mountUI(uiCtx);
		}
		refresh();
	};

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

	const applyPreset = (preset: Preset) => {
		const names = new Set([
			...Object.keys(segmentConfigs),
			...Object.keys(preset.formats),
			...Object.keys(preset.colors ?? {}),
		]);
		for (const name of names) {
			const colorEntry = preset.colors?.[name];
			// bg always follows the preset (cleared when not listed); color is
			// only touched for segments the preset explicitly colors.
			const patch: Partial<SegmentConfig> = {
				format: preset.formats[name],
				bg: colorEntry?.bg,
			};
			if (colorEntry) patch.color = colorEntry.color;
			segmentConfigs = applySegmentPatch(segmentConfigs, name, patch);
		}
		if (preset.separator) {
			separatorConfig = preset.separator;
			writeGlobalConfig({ separator: separatorConfig });
		}
		persistSegments();
	};

	const deps: ConfiguratorDeps = {
		getVisibleSegments: () => visibleSegments,
		setVisibleSegments: (segments) => {
			visibleSegments = serializeSegments(segments);
			for (const name of ALL_SEGMENTS) {
				segmentConfigs = applySegmentPatch(segmentConfigs, name, {
					hidden: visibleSegments.includes(name) ? undefined : true,
				});
			}
			persistSegments();
		},
		getStatusFilter: () => statusFilter,
		setStatusFilter: (filter) => {
			statusFilter = filter;
			writeGlobalConfig({ statusFilter: serializeStatusFilter(filter) });
			refresh();
		},
		getSegmentConfigs: () => segmentConfigs,
		updateSegmentConfig: (name, patch) => {
			segmentConfigs = applySegmentPatch(segmentConfigs, name, patch);
			persistSegments();
		},
		getStyle: () => styleConfig,
		updateStyle: (patch) => {
			const positionChanged =
				"position" in patch && (patch.position ?? "footer") !== (styleConfig.position ?? "footer");
			styleConfig = applyStylePatch(styleConfig, patch);
			writeGlobalConfig({ style: styleConfig });
			if (positionChanged && uiCtx) mountUI(uiCtx);
			refresh();
		},
		setStyle: (style) => {
			const positionChanged = (style.position ?? "footer") !== (styleConfig.position ?? "footer");
			styleConfig = { ...style };
			writeGlobalConfig({ style: styleConfig });
			if (positionChanged && uiCtx) mountUI(uiCtx);
			refresh();
		},
		getSeparator: () => ({
			char: separatorConfig.char ?? SEGMENT_SEPARATOR,
			color: separatorConfig.color ?? "dim",
			mode: separatorConfig.mode ?? "char",
		}),
		setSeparator: (char) => {
			separatorConfig = { ...separatorConfig, char };
			writeGlobalConfig({ separator: separatorConfig });
			refresh();
		},
		setSeparatorColor: (color) => {
			separatorConfig = { ...separatorConfig, color };
			writeGlobalConfig({ separator: separatorConfig });
			refresh();
		},
		setSeparatorMode: (mode) => {
			separatorConfig = { ...separatorConfig, mode: mode === "char" ? undefined : mode };
			writeGlobalConfig({ separator: separatorConfig });
			refresh();
		},
		seenStatusKeys,
		refresh,
	};

	pi.registerCommand("info", {
		description: "Configure the pi-info footer",
		getArgumentCompletions(prefix: string) {
			const word = prefix.trim().split(/\s+/).filter(Boolean).pop() ?? "";
			const items = ["segments", "color", "order", "separator", "format", "style", "preset"];
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
					case "color":
					case "colors":
						await openColorConfigurator(ctx, deps);
						return true;
					case "order":
						await openOrderConfigurator(ctx, deps);
						return true;
					case "separator":
					case "sep":
						await openSeparatorConfigurator(ctx, deps);
						return true;
					case "format":
					case "formats":
						await openFormatConfigurator(ctx, deps);
						return true;
					case "style":
					case "styles":
						await openStyleConfigurator(ctx, deps);
						return true;
					case "preset":
					case "presets": {
						const choice = await ctx.ui.select(
							"Format preset",
							PRESETS.map((preset) => `${preset.name} — ${preset.description}`),
						);
						const preset = choice
							? PRESETS.find((p) => choice.startsWith(p.name))
							: undefined;
						if (preset) applyPreset(preset);
						return true;
					}
					default:
						return false;
				}
			};

			if (await route(direct)) return;

			const choice = await ctx.ui.select("pi-info", [
				"segments  — show/hide footer segments",
				"color     — change segment colors",
				"order     — reorder segment display",
				"separator — change the segment separator",
				"format    — edit segment format templates",
				"style     — container style: position, border, background",
				"preset    — apply a format preset",
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
		loadConfig();
		restoreStatusFilter(ctx);
		thresholds = parseThresholds();
		mountUI(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		stopTicker();
		if (ctx.hasUI) {
			ctx.ui.setFooter(undefined);
			ctx.ui.setWidget("pi-info:aboveEditor", undefined);
			ctx.ui.setWidget("pi-info:belowEditor", undefined);
		}
		uiCtx = undefined;
	});
}
