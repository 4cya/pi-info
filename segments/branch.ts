import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SegmentProvider } from "./types.js";

/**
 * Branch segment: shows the current git branch.
 *
 * Walks up from ctx.cwd looking for .git/HEAD and parses it.
 * Hidden when no git repo is found.
 * Variables: {branch}
 */
const branch: SegmentProvider = {
	name: "branch",
	label: "Git Branch",
	data(ctx) {
		let dir = ctx.cwd;
		while (true) {
			const headPath = join(dir, ".git", "HEAD");
			try {
				const head = readFileSync(headPath, "utf8").trim();
				// ref: refs/heads/main → main
				const match = head.match(/^ref: refs\/heads\/(.+)$/);
				if (match) return { branch: match[1] };
				// Detached HEAD — show short sha
				return { branch: head.slice(0, 7) };
			} catch {
				const parent = join(dir, "..");
				if (parent === dir) return null;
				dir = parent;
			}
		}
	},
	defaultFormat: "{branch}",
	color: () => "#a6e3a1",
};

export default branch;
