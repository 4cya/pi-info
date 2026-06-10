import { homedir } from "node:os";
import type { SegmentProvider } from "./types.js";

/**
 * CWD segment: shows current working directory with ~ for home.
 * Variables: {dir}
 */
const cwd: SegmentProvider = {
	name: "cwd",
	label: "CWD",
	data(ctx) {
		const dir = ctx.cwd;
		const home = process.env.HOME || process.env.USERPROFILE || homedir();
		if (home && dir.startsWith(home)) {
			return { dir: `~${dir.slice(home.length)}` };
		}
		return { dir };
	},
	defaultFormat: "{dir}",
	color: () => "dim",
};

export default cwd;
