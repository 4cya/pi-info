import { execSync } from "node:child_process";
import type { CustomSegmentConfig } from "../lib/config.js";
import type { SegmentProvider } from "./types.js";

/**
 * Creates a SegmentProvider from a declarative CustomSegmentConfig.
 * Runs the shell command and caches stdout for `interval` seconds.
 */
export function createCustomSegment(cfg: CustomSegmentConfig): SegmentProvider {
	let cached = "";
	let lastFetch = 0;
	const interval = (cfg.interval ?? 60) * 1000;

	return {
		name: cfg.name,
		label: cfg.label,
		render() {
			const now = Date.now();
			if (now - lastFetch < interval) return cached || null;
			try {
				cached = execSync(cfg.command, {
					encoding: "utf8",
					timeout: 5000,
					maxBuffer: 4096,
				}).trim();
				lastFetch = now;
				return cached || null;
			} catch {
				// On failure, return stale cache or null.
				return cached || null;
			}
		},
		color: cfg.color ? () => cfg.color! : undefined,
	};
}
