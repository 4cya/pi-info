import { describe, expect, it } from "bun:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { composeEdgeLine } from "../lib/editor-embed.js";
import { stripAnsi } from "./helpers.js";

const rule = (s: string) => `\x1b[2m${s}\x1b[0m`;
const content = "\x1b[36mmodel\x1b[39m  \x1b[2m❯\x1b[0m  2.6%";

describe("composeEdgeLine", () => {
	it("weaves content into a rule at exactly terminal width", () => {
		for (const align of ["left", "center", "right"] as const) {
			const line = composeEdgeLine(content, 60, align, rule);
			expect(visibleWidth(line)).toBe(60);
			expect(stripAnsi(line)).toContain("model");
			expect(stripAnsi(line).startsWith("───")).toBe(true);
			expect(stripAnsi(line).endsWith("───")).toBe(true);
		}
	});

	it("aligns the content within the rule", () => {
		const left = stripAnsi(composeEdgeLine("ab", 40, "left", rule));
		const right = stripAnsi(composeEdgeLine("ab", 40, "right", rule));
		expect(left.indexOf("ab")).toBeLessThan(right.indexOf("ab"));
	});

	it("truncates overwide content without exceeding the width", () => {
		const line = composeEdgeLine(content + " " + "x".repeat(100), 40, "left", rule);
		expect(visibleWidth(line)).toBe(40);
	});

	it("stays within tiny widths", () => {
		const line = composeEdgeLine("abc", 12, "left", rule);
		expect(visibleWidth(line)).toBe(12);
	});
});
