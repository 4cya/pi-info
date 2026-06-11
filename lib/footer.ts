/**
 * Footer line rendering: turns current state (model, thinking level, context
 * usage, extension statuses, dynamic segments) into the single styled line pi
 * displays.
 *
 * Every segment renders through the same pipeline: a variable map + a format
 * template (the segment's default or the user's per-segment override), then
 * styled runs are colored — plain runs with the segment's base color,
 * [..](style) runs with their own style ("auto" = the segment's semantic
 * color, e.g. context's threshold color).
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import {
	applyColor,
	applyStyle,
	contextColor,
	thinkingColor,
} from "./colors.js";
import type { SegmentConfig, SeparatorConfig, StyleConfig } from "./config.js";
import {
	SEGMENT_SEPARATOR,
	type SegmentName,
} from "./constants.js";
import { registeredSegments, visibleDynamic } from "./registry.js";
import { shouldShowStatus, type StatusFilter } from "./status-filter.js";
import { applyContainerStyle, contentWidthFor } from "./style.js";
import { renderTemplate, runsText, trimRuns, type StyledRun } from "./template.js";
import { formatModelName, formatTokens, stripTerminalControls } from "./text.js";

export type FooterRenderState = {
	visibleSegments: readonly SegmentName[];
	statusFilter: StatusFilter;
	segmentConfigs: Record<string, SegmentConfig>;
	seenStatusKeys: Set<string>;
	warningThreshold: number;
	errorThreshold: number;
	thinkingLevel: string;
	separator?: SeparatorConfig;
	style?: StyleConfig;
};

/** A segment ready for the template pipeline. */
type SegmentSpec = {
	vars: Record<string, string>;
	defaultFormat: string;
	/** Semantic default color; resolves "auto" in templates. */
	autoColor: string;
};

/**
 * Filter + sanitize extension statuses into {key, text} pairs.
 * Also records every key seen so the configurators can list them later.
 */
export function formatExtensionStatuses(
	statuses: ReadonlyMap<string, string>,
	filter: StatusFilter,
	seenStatusKeys: Set<string>,
): { key: string; text: string }[] {
	return Array.from(statuses.entries())
		.filter(([, text]) => stripTerminalControls(text).trim().length > 0)
		.filter(([key]) => {
			seenStatusKeys.add(key);
			return shouldShowStatus(key, filter);
		})
		.map(([key, text]) => ({
			key: stripTerminalControls(key),
			text: stripTerminalControls(text),
		}));
}

/**
 * Greedy line packing for overflow "wrap": segments that fit join the
 * current line, the rest start new ones. A single overwide segment stays
 * alone on its line (the container layer truncates it).
 */
function packLines(parts: string[], separator: string, maxWidth: number): string[] {
	const sepWidth = visibleWidth(separator);
	const lines: string[] = [];
	let current: string[] = [];
	let currentWidth = 0;
	for (const part of parts) {
		const partWidth = visibleWidth(part);
		if (current.length > 0 && currentWidth + sepWidth + partWidth > maxWidth) {
			lines.push(current.join(separator));
			current = [];
			currentWidth = 0;
		}
		currentWidth += current.length > 0 ? sepWidth + partWidth : partWidth;
		current.push(part);
	}
	if (current.length > 0) lines.push(current.join(separator));
	return lines.length > 0 ? lines : [""];
}

/** Full pipeline: segment content line(s) wrapped in the container style. */
export function renderFooterLines(
	ctx: ExtensionContext,
	theme: Theme,
	width: number,
	state: FooterRenderState,
	extensionStatuses: ReadonlyMap<string, string>,
): string[] {
	const style = state.style ?? {};
	const { parts, separator } = renderFooterParts(ctx, theme, state, extensionStatuses);
	const content =
		style.overflow === "wrap"
			? packLines(parts, separator, contentWidthFor(width, style))
			: parts.join(separator);
	return applyContainerStyle(content, width, style, theme);
}

/** Renders the untruncated segment content line (no container styling). */
export function renderFooterLine(
	ctx: ExtensionContext,
	theme: Theme,
	_width: number,
	state: FooterRenderState,
	extensionStatuses: ReadonlyMap<string, string>,
): string {
	const { parts, separator } = renderFooterParts(ctx, theme, state, extensionStatuses);
	return parts.join(separator);
}

/** Renders each segment to its colored text, in display order. */
function renderFooterParts(
	ctx: ExtensionContext,
	theme: Theme,
	state: FooterRenderState,
	extensionStatuses: ReadonlyMap<string, string>,
): { parts: string[]; separator: string } {
	// Template pipeline: format → styled runs → colored text. Returns null
	// when the rendered text is empty (e.g. all optional groups vanished).
	const renderSpec = (name: string, spec: SegmentSpec): string | null => {
		const cfg = state.segmentConfigs[name];
		const format = cfg?.format ?? spec.defaultFormat;
		let runs: StyledRun[];
		try {
			runs = renderTemplate(format, spec.vars);
		} catch {
			// Broken user template: show it literally so the problem is visible.
			runs = [{ text: format, style: null }];
		}
		runs = trimRuns(runs);
		if (!runsText(runs)) return null;
		const baseColor = cfg?.color ?? spec.autoColor;
		return runs
			.map((run) =>
				run.style
					? applyStyle(run.style, theme, run.text, spec.autoColor)
					: applyColor(baseColor, theme, run.text),
			)
			.join("");
	};

	const parts: { key: string; text: string }[] = [];
	const push = (key: string, text: string | null) => {
		if (text) parts.push({ key, text });
	};

	// Built-in segments.
	const usage = ctx.getContextUsage();
	const builtinSpecs: Record<Exclude<SegmentName, "extensions">, SegmentSpec | null> = {
		model: {
			vars: { name: formatModelName(ctx.model?.id), id: ctx.model?.id ?? "" },
			defaultFormat: "{name}",
			autoColor: "accent",
		},
		thinking: {
			vars: { level: state.thinkingLevel },
			defaultFormat: "think:{level}",
			autoColor: thinkingColor(state.thinkingLevel),
		},
		context: usage
			? {
				vars: {
					percent: usage.percent !== null ? usage.percent.toFixed(1) : "—",
					window: formatTokens(usage.contextWindow),
				},
				defaultFormat: "{percent}% / {window}",
				autoColor: contextColor(usage.percent, state.warningThreshold, state.errorThreshold),
			}
			: null,
	};

	for (const segment of state.visibleSegments) {
		if (segment === "extensions") {
			// Each status renders through the template individually; the
			// separators between statuses stay dim.
			const statusParts = formatExtensionStatuses(
				extensionStatuses,
				state.statusFilter,
				state.seenStatusKeys,
			);
			const rendered = statusParts
				.map(({ key, text }) =>
					renderSpec("extensions", {
						vars: { key, text },
						defaultFormat: "{key}:{text}",
						autoColor: "text",
					}),
				)
				.filter((text): text is string => text !== null);
			if (rendered.length > 0) {
				push(
					"extensions",
					rendered.join(` ${theme.fg("dim", SEGMENT_SEPARATOR)} `),
				);
			}
			continue;
		}
		const spec = builtinSpecs[segment];
		if (spec) push(segment, renderSpec(segment, spec));
	}

	// Registered (dynamic) segments that are visible.
	for (const [name, provider] of registeredSegments) {
		if (!visibleDynamic.has(name)) continue;
		try {
			let vars: Record<string, string> | null = null;
			let defaultFormat = provider.defaultFormat ?? "{output}";
			if (provider.data) {
				vars = provider.data(ctx);
			} else if (provider.render) {
				const output = provider.render(ctx);
				if (output) vars = { output };
			}
			if (!vars) continue;
			const autoColor = provider.color ? String(provider.color(ctx)) : "dim";
			push(name, renderSpec(name, { vars, defaultFormat, autoColor }));
		} catch {
			// Skip broken segments rather than break the whole footer.
		}
	}

	// Apply custom priority order (lower = earlier, ties broken alphabetically).
	const orderOf = (key: string) => state.segmentConfigs[key]?.order ?? 999;
	parts.sort((a, b) => {
		const pa = orderOf(a.key);
		const pb = orderOf(b.key);
		if (pa !== pb) return pa - pb;
		return 0; // keep registration order for ties
	});

	const separatorChar = state.separator?.char ?? SEGMENT_SEPARATOR;
	// Empty separator collapses to plain spacing between segments.
	const separator = separatorChar
		? `  ${applyColor(state.separator?.color ?? "dim", theme, separatorChar)}  `
		: "  ";
	// Truncation happens in the container layer (applyContainerStyle),
	// which knows the border/padding overhead.
	return { parts: parts.map((part) => part.text), separator };
}
