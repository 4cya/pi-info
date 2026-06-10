import { execSync } from "node:child_process";
import type { ThemeColor } from "@earendil-works/pi-coding-agent";
import type { SegmentConfig } from "../lib/config.js";
import type { SegmentProvider } from "./types.js";

/**
 * Creates a SegmentProvider from a shell-command segment config entry.
 * Runs the command and caches stdout for `interval` seconds.
 * Variables: {output}
 */
export function createCustomSegment(name: string, cfg: SegmentConfig): SegmentProvider {
	const command = cfg.command;
	if (!command) throw new Error(`custom segment "${name}" has no command`);
	let cached = "";
	let lastFetch = 0;
	const interval = (cfg.interval ?? 60) * 1000;

	const fetchOutput = (): string => {
		const now = Date.now();
		if (now - lastFetch < interval) return cached;
		// Failures also bump lastFetch so a broken command can't block
		// every render tick; stale output is kept until it succeeds.
		lastFetch = now;
		try {
			cached = execSync(command, {
				encoding: "utf8",
				timeout: 5000,
				maxBuffer: 4096,
			}).trim();
		} catch {
			// Keep stale output.
		}
		return cached;
	};

	return {
		name,
		label: cfg.label ?? name,
		data() {
			const output = fetchOutput();
			return output ? { output } : null;
		},
		defaultFormat: "{output}",
		color: cfg.color ? () => cfg.color as ThemeColor | `#${string}` : undefined,
	};
}
