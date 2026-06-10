/**
 * Footer line rendering: turns current state (model, thinking level, context
 * usage, extension statuses, dynamic segments) into the single styled line pi
 * displays.
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import {
	applyColor,
	contextColor,
	thinkingColor,
} from "./colors.js";
import {
	EXTENSION_STATUS_SEPARATOR,
	SEGMENT_SEPARATOR,
	type SegmentName,
} from "./constants.js";
import { registeredSegments, visibleDynamic } from "./registry.js";
import { shouldShowStatus, type StatusFilter } from "./status-filter.js";
import { formatModelName, formatTokens, stripTerminalControls } from "./text.js";

export type FooterRenderState = {
	visibleSegments: readonly SegmentName[];
	statusFilter: StatusFilter;
	segmentColors: Record<string, string>;
	segmentOrder: Record<string, number>;
	seenStatusKeys: Set<string>;
	warningThreshold: number;
	errorThreshold: number;
	thinkingLevel: string;
};

/**
 * Filter + sanitize extension statuses into "key:text" parts.
 * Also records every key seen so the configurators can list them later.
 */
export function formatExtensionStatuses(
	statuses: ReadonlyMap<string, string>,
	filter: StatusFilter,
	seenStatusKeys: Set<string>,
): string[] | null {
	const parts = Array.from(statuses.entries())
		.filter(([, text]) => stripTerminalControls(text).trim().length > 0)
		.filter(([key]) => {
			seenStatusKeys.add(key);
			return shouldShowStatus(key, filter);
		})
		.map(([key, text]) =>
			`${stripTerminalControls(key)}:${stripTerminalControls(text)}`,
		);

	return parts.length > 0 ? parts : null;
}

export function renderFooterLine(
	ctx: ExtensionContext,
	theme: Theme,
	width: number,
	state: FooterRenderState,
	extensionStatuses: ReadonlyMap<string, string>,
): string {
	const colorOf = (name: string, fallback: string, text: string): string => {
		const override = state.segmentColors[name];
		return applyColor(override ?? fallback, theme, text);
	};

	const modelName = formatModelName(ctx.model?.id);
	const usage = ctx.getContextUsage();
	const contextText = usage
		? `${usage.percent !== null ? `${usage.percent.toFixed(1)}%` : "—%"} / ${formatTokens(usage.contextWindow)}`
		: "—";

	const statusParts = formatExtensionStatuses(
		extensionStatuses,
		state.statusFilter,
		state.seenStatusKeys,
	);
	// Color override applies per status part; the separators stay dim.
	const extensionsText = statusParts
		? statusParts
			.map((part) => colorOf("extensions", "text", part))
			.join(` ${theme.fg("dim", EXTENSION_STATUS_SEPARATOR)} `)
		: null;

	const builtinRenderers: Record<SegmentName, string | null> = {
		model: colorOf("model", "accent", modelName),
		thinking: colorOf(
			"thinking",
			thinkingColor(state.thinkingLevel),
			`think:${state.thinkingLevel}`,
		),
		context: colorOf(
			"context",
			contextColor(usage?.percent, state.warningThreshold, state.errorThreshold),
			contextText,
		),
		extensions: extensionsText,
	};

	const parts: { key: string; text: string }[] = state.visibleSegments
		.map((segment) => ({ key: segment as string, text: builtinRenderers[segment] }))
		.filter((part): part is { key: string; text: string } => part.text !== null);

	// Render registered (dynamic) segments that are visible.
	for (const [name, provider] of registeredSegments) {
		if (!visibleDynamic.has(name)) continue;
		try {
			const text = provider.render(ctx);
			if (text) {
				const fallback = provider.color ? provider.color(ctx) : "dim";
				parts.push({ key: name, text: colorOf(name, fallback, text) });
			}
		} catch {
			// Skip broken segments rather than break the whole footer.
		}
	}

	// Apply custom priority order if configured (lower = earlier, ties broken alphabetically).
	if (Object.keys(state.segmentOrder).length > 0) {
		parts.sort((a, b) => {
			const pa = state.segmentOrder[a.key] ?? 999;
			const pb = state.segmentOrder[b.key] ?? 999;
			if (pa !== pb) return pa - pb;
			return a.key.localeCompare(b.key);
		});
	}

	const separator = `  ${theme.fg("dim", SEGMENT_SEPARATOR)}  `;
	return truncateToWidth(parts.map((part) => part.text).join(separator), width);
}
