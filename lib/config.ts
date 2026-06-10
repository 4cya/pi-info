/**
 * Persistent global config (~/.pi/agent/pi-info.json) and environment
 * variable parsing.
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
	/** Per-segment priority numbers (segment name → number). Lower = earlier. */
	segmentOrder?: Record<string, number>;
};

export const CONFIG_PATH =
	process.env.PI_INFO_CONFIG ??
	join(homedir(), ".pi", "agent", "pi-info.json");

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
			segmentOrder:
				data.segmentOrder && typeof data.segmentOrder === "object" && !Array.isArray(data.segmentOrder)
					? Object.fromEntries(
						Object.entries(data.segmentOrder as Record<string, unknown>).filter(
							(entry): entry is [string, number] =>
								typeof entry[0] === "string" && typeof entry[1] === "number",
						),
					)
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
	return process.env.PI_INFO_SHOW
		? parseSegmentsEnv()
		: readGlobalConfig().segments ?? null;
}
