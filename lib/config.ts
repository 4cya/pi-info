/**
 * Persistent global config (~/.pi/agent/pi-info.json) and environment
 * variable parsing.
 *
 * Schema: one config object per segment, keyed by segment name.
 *   {
 *     "separator": { "char": "❯", "color": "dim" },
 *     "style": { "position": "footer", "border": "rounded", "padding": 1 },
 *     "segments": {
 *       "model": { "format": " {name}", "color": "accent", "order": 1 },
 *       "io": false,
 *       "weather": { "command": "curl -s 'wttr.in?format=%t'", "interval": 300 }
 *     }
 *   }
 *
 * Environment variables:
 *   PI_INFO_SHOW              comma-separated list of segments to show
 *   PI_INFO_THRESHOLDS        warning,danger context-usage percentages
 *   PI_INFO_CONFIG            override the persisted config path
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	ALL_SEGMENTS,
	BORDER_STYLES,
	DEFAULT_ERROR_THRESHOLD,
	DEFAULT_SEGMENTS,
	DEFAULT_WARNING_THRESHOLD,
	isSegmentName,
	STYLE_ALIGNS,
	STYLE_OVERFLOWS,
	STYLE_POSITIONS,
	STYLE_WIDTHS,
	type BorderStyleName,
	type SegmentName,
	type StyleAlign,
	type StyleOverflow,
	type StylePosition,
	type StyleWidth,
} from "./constants.js";
import type { SerializedStatusFilter } from "./status-filter.js";

export type SegmentConfig = {
	/** Hide the segment. JSON shorthand: `"name": false`. */
	hidden?: boolean;
	/** Template string (see lib/template.ts). Omit for the segment's default. */
	format?: string;
	/** Base color (hex or theme name) for untemplated text. */
	color?: string;
	/** Display priority; lower = earlier. Default 999. */
	order?: number;
	/** Shell-command segments: label shown in /info. Defaults to the name. */
	label?: string;
	/** Shell-command segments: command whose stdout becomes {output}. */
	command?: string;
	/** Shell-command segments: cache stdout for this many seconds. Default 60. */
	interval?: number;
};

export type SeparatorConfig = {
	/** Separator string between segments. Default "❯". */
	char?: string;
	/** Separator color (hex or theme color). Default "dim". */
	color?: string;
};

/**
 * Container-level style for the whole statusline. Every field is optional;
 * all-defaults renders exactly like versions without this block (footer,
 * left-aligned, full width, no border/background/margins).
 */
export type StyleConfig = {
	/** Where the line is mounted. Non-footer placements hide pi's built-in footer. */
	position?: StylePosition;
	/** full: content position inside the bar; content: bar position in the terminal. */
	align?: StyleAlign;
	/** full = span the terminal; content = shrink-wrap the segments. */
	width?: StyleWidth;
	/** Overwide content: truncate (default) or wrap onto more lines at segment boundaries. */
	overflow?: StyleOverflow;
	/** Spaces between content and the border/background edge. */
	padding?: number;
	/** Blank lines above/below the container. */
	marginTop?: number;
	marginBottom?: number;
	/** Background: #RRGGBB or a pi theme bg name (e.g. selectedBg). */
	background?: string;
	border?: BorderStyleName;
	/** Border color (hex or theme color). Default "dim". */
	borderColor?: string;
};

export type GlobalConfig = {
	statusFilter?: SerializedStatusFilter;
	separator?: SeparatorConfig;
	style?: StyleConfig;
	/** Per-segment overrides; `false` hides a segment. */
	segments?: Record<string, SegmentConfig>;
};

export const CONFIG_PATH =
	process.env.PI_INFO_CONFIG ??
	join(homedir(), ".pi", "agent", "pi-info.json");

/** Normalize to canonical order and drop unknown names. */
export function serializeSegments(segments: readonly SegmentName[]): SegmentName[] {
	return ALL_SEGMENTS.filter((segment) => segments.includes(segment));
}

export function splitSegmentNames(raw: string): SegmentName[] {
	return raw
		.split(/[\s,]+/)
		.map((segment) => segment.trim().toLowerCase())
		.filter(isSegmentName);
}

export function parseSegmentsEnv(): SegmentName[] {
	const raw = process.env.PI_INFO_SHOW;
	if (!raw) return DEFAULT_SEGMENTS;

	const requested = raw
		.split(",")
		.map((segment) => segment.trim().toLowerCase())
		.filter(isSegmentName);

	return requested.length > 0 ? requested : DEFAULT_SEGMENTS;
}

export function parseThresholds(): { warningThreshold: number; errorThreshold: number } {
	const raw = process.env.PI_INFO_THRESHOLDS;
	if (!raw) {
		return {
			warningThreshold: DEFAULT_WARNING_THRESHOLD,
			errorThreshold: DEFAULT_ERROR_THRESHOLD,
		};
	}

	const [warning, error] = raw
		.split(",")
		.map((value) => Number.parseFloat(value.trim()));

	if (
		Number.isFinite(warning) &&
		Number.isFinite(error) &&
		warning >= 0 &&
		error > warning
	) {
		return { warningThreshold: warning, errorThreshold: error };
	}

	return {
		warningThreshold: DEFAULT_WARNING_THRESHOLD,
		errorThreshold: DEFAULT_ERROR_THRESHOLD,
	};
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return Math.min(max, Math.max(min, Math.round(value)));
}

function oneOf<T extends string>(value: unknown, valid: readonly T[]): T | undefined {
	return typeof value === "string" && (valid as readonly string[]).includes(value)
		? (value as T)
		: undefined;
}

/** Drops unknown keys and out-of-range values; never throws. */
export function sanitizeStyleConfig(value: unknown): StyleConfig {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const v = value as Record<string, unknown>;
	const out: StyleConfig = {};
	const position = oneOf(v.position, STYLE_POSITIONS);
	if (position) out.position = position;
	const align = oneOf(v.align, STYLE_ALIGNS);
	if (align) out.align = align;
	const width = oneOf(v.width, STYLE_WIDTHS);
	if (width) out.width = width;
	const overflow = oneOf(v.overflow, STYLE_OVERFLOWS);
	if (overflow) out.overflow = overflow;
	const padding = clampInt(v.padding, 0, 8);
	if (padding !== undefined) out.padding = padding;
	const marginTop = clampInt(v.marginTop, 0, 5);
	if (marginTop !== undefined) out.marginTop = marginTop;
	const marginBottom = clampInt(v.marginBottom, 0, 5);
	if (marginBottom !== undefined) out.marginBottom = marginBottom;
	if (typeof v.background === "string") out.background = v.background;
	const border = oneOf(v.border, BORDER_STYLES);
	if (border) out.border = border;
	if (typeof v.borderColor === "string") out.borderColor = v.borderColor;
	return out;
}

/**
 * Merge a patch into a style config. `undefined` patch values delete the
 * key (restoring the default). Pure — returns a new object.
 */
export function applyStylePatch(
	style: StyleConfig,
	patch: Partial<StyleConfig>,
): StyleConfig {
	const next: Record<string, unknown> = { ...style };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) delete next[key];
		else next[key] = value;
	}
	return next as StyleConfig;
}

/** Validates one segment entry; `false` is shorthand for { hidden: true }. */
function sanitizeSegmentConfig(value: unknown): SegmentConfig | null {
	if (value === false) return { hidden: true };
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const v = value as Record<string, unknown>;
	const out: SegmentConfig = {};
	if (typeof v.hidden === "boolean") out.hidden = v.hidden;
	if (typeof v.format === "string") out.format = v.format;
	if (typeof v.color === "string") out.color = v.color;
	if (typeof v.order === "number") out.order = v.order;
	if (typeof v.label === "string") out.label = v.label;
	if (typeof v.command === "string") out.command = v.command;
	if (typeof v.interval === "number") out.interval = v.interval;
	return out;
}

export function readGlobalConfig(): GlobalConfig {
	try {
		const data = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Record<string, unknown>;
		const config: GlobalConfig = {
			statusFilter: (data.statusFilter as SerializedStatusFilter | undefined) ?? undefined,
		};
		if (data.separator && typeof data.separator === "object" && !Array.isArray(data.separator)) {
			const sep = data.separator as Record<string, unknown>;
			config.separator = {
				char: typeof sep.char === "string" ? sep.char : undefined,
				color: typeof sep.color === "string" ? sep.color : undefined,
			};
		}
		if (data.style !== undefined) {
			const style = sanitizeStyleConfig(data.style);
			if (Object.keys(style).length > 0) config.style = style;
		}
		if (data.segments && typeof data.segments === "object" && !Array.isArray(data.segments)) {
			const segments: Record<string, SegmentConfig> = {};
			for (const [name, value] of Object.entries(data.segments)) {
				const cfg = sanitizeSegmentConfig(value);
				if (cfg) segments[name] = cfg;
			}
			config.segments = segments;
		}
		return config;
	} catch {
		return {};
	}
}

/**
 * Merge a patch into one segment's entry. `undefined` patch values delete
 * the key; entries that end up empty are dropped. Pure — returns a new map.
 */
export function applySegmentPatch(
	segments: Record<string, SegmentConfig>,
	name: string,
	patch: Partial<SegmentConfig>,
): Record<string, SegmentConfig> {
	const entry: Record<string, unknown> = { ...(segments[name] ?? {}) };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) delete entry[key];
		else entry[key] = value;
	}
	const next = { ...segments };
	if (Object.keys(entry).length === 0) delete next[name];
	else next[name] = entry as SegmentConfig;
	return next;
}

export function writeGlobalConfig(patch: Partial<GlobalConfig>): void {
	const config = { ...readGlobalConfig(), ...patch };
	// Compact serialization: { hidden: true } alone becomes `false`.
	const serializable = {
		...config,
		segments: config.segments
			? Object.fromEntries(
				Object.entries(config.segments).map(([name, cfg]) => [
					name,
					cfg.hidden === true && Object.keys(cfg).length === 1 ? false : cfg,
				]),
			)
			: undefined,
	};
	const data = JSON.stringify(serializable, null, 2);
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	// Write-then-rename keeps the config readable by concurrent pi sessions.
	const tmpPath = `${CONFIG_PATH}.${process.pid}.tmp`;
	writeFileSync(tmpPath, `${data}\n`, "utf8");
	renameSync(tmpPath, CONFIG_PATH);
}

/** Env var wins over persisted config so launch-time overrides stay possible. */
export function readGlobalSegments(): SegmentName[] | null {
	if (process.env.PI_INFO_SHOW) return parseSegmentsEnv();
	const segments = readGlobalConfig().segments;
	if (!segments) return null;
	return ALL_SEGMENTS.filter((name) => segments[name]?.hidden !== true);
}
