/**
 * Persistent global config (~/.pi/agent/pi-statusline.json) and environment
 * variable parsing.
 *
 * Environment variables:
 *   PI_STATUSLINE_SHOW        comma-separated list of segments to show
 *   PI_STATUSLINE_THRESHOLDS  warning,danger context-usage percentages
 *   PI_STATUSLINE_CONFIG      override the persisted config path
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	ALL_SEGMENTS,
	DEFAULT_ERROR_THRESHOLD,
	DEFAULT_SEGMENTS,
	DEFAULT_WARNING_THRESHOLD,
	isSegmentName,
	type SegmentName,
} from "./constants.js";
import type { SerializedStatusFilter } from "./status-filter.js";

export type GlobalConfig = {
	statusFilter?: SerializedStatusFilter;
	segments?: SegmentName[];
	/** Visible dynamic (registered) segment names. */
	dynamicSegments?: string[];
	/** Per-segment color overrides (segment name → hex or theme color). */
	segmentColors?: Record<string, string>;
	/** Custom segment display order. Unlisted segments appear after listed ones. */
	segmentOrder?: string[];
};

export const CONFIG_PATH =
	process.env.PI_STATUSLINE_CONFIG ??
	join(homedir(), ".pi", "agent", "pi-statusline.json");

/** Normalize to canonical order and drop unknown names. */
export function serializeSegments(segments: readonly SegmentName[]): SegmentName[] {
	return ALL_SEGMENTS.filter((segment) => segments.includes(segment));
}

export function parseSerializedSegments(value: unknown): SegmentName[] | null {
	if (!Array.isArray(value)) return null;
	const segments = value.filter(
		(segment): segment is SegmentName => typeof segment === "string" && isSegmentName(segment),
	);
	return serializeSegments(segments);
}

export function splitSegmentNames(raw: string): SegmentName[] {
	return raw
		.split(/[\s,]+/)
		.map((segment) => segment.trim().toLowerCase())
		.filter(isSegmentName);
}

export function parseSegmentsEnv(): SegmentName[] {
	const raw = process.env.PI_STATUSLINE_SHOW;
	if (!raw) return DEFAULT_SEGMENTS;

	const requested = raw
		.split(",")
		.map((segment) => segment.trim().toLowerCase())
		.filter(isSegmentName);

	return requested.length > 0 ? requested : DEFAULT_SEGMENTS;
}

export function parseThresholds(): { warningThreshold: number; errorThreshold: number } {
	const raw = process.env.PI_STATUSLINE_THRESHOLDS;
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

export function readGlobalConfig(): GlobalConfig {
	try {
		const data = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Record<string, unknown>;
		return {
			statusFilter: (data.statusFilter as SerializedStatusFilter | undefined) ?? undefined,
			segments: parseSerializedSegments(data.segments) ?? undefined,
			dynamicSegments: Array.isArray(data.dynamicSegments)
				? data.dynamicSegments.filter((name): name is string => typeof name === "string")
				: undefined,
			segmentColors:
				data.segmentColors && typeof data.segmentColors === "object" && !Array.isArray(data.segmentColors)
					? (data.segmentColors as Record<string, string>)
					: undefined,
			segmentOrder: Array.isArray(data.segmentOrder)
				? data.segmentOrder.filter((name): name is string => typeof name === "string")
				: undefined,
		};
	} catch {
		return {};
	}
}

export function writeGlobalConfig(patch: Partial<GlobalConfig>): void {
	const config = { ...readGlobalConfig(), ...patch };
	const data = JSON.stringify(config, null, 2);
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	// Write-then-rename keeps the config readable by concurrent pi sessions.
	const tmpPath = `${CONFIG_PATH}.${process.pid}.tmp`;
	writeFileSync(tmpPath, `${data}\n`, "utf8");
	renameSync(tmpPath, CONFIG_PATH);
}

/** Env var wins over persisted config so launch-time overrides stay possible. */
export function readGlobalSegments(): SegmentName[] | null {
	return process.env.PI_STATUSLINE_SHOW
		? parseSegmentsEnv()
		: readGlobalConfig().segments ?? null;
}
