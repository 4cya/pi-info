import { describe, expect, it } from "bun:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { applyContainerStyle, contentWidthFor } from "../lib/style.js";
import { stripAnsi, theme } from "./helpers.js";

const content = "model  \x1b[2m❯\x1b[0m  2.6% / 1.0M";
const W = 60;

describe("applyContainerStyle", () => {
	it("default style returns the content untouched (byte-compatible path)", () => {
		expect(applyContainerStyle(content, W, {}, theme)).toEqual([content]);
	});

	it("boxed: three lines, all exactly terminal width", () => {
		const lines = applyContainerStyle(content, W, { border: "rounded", padding: 1 }, theme);
		expect(lines).toHaveLength(3);
		for (const line of lines) expect(visibleWidth(line)).toBe(W);
		expect(stripAnsi(lines[0])[0]).toBe("╭");
		expect(stripAnsi(lines[2])[0]).toBe("╰");
	});

	it("island: shrink-wrapped and centered", () => {
		const lines = applyContainerStyle(
			content,
			W,
			{ align: "center", width: "content", border: "rounded", padding: 1 },
			theme,
		);
		expect(lines).toHaveLength(3);
		const top = stripAnsi(lines[0]);
		expect(top.startsWith(" ")).toBe(true); // centered → indented
		expect(top.trim().startsWith("╭")).toBe(true);
		expect(visibleWidth(lines[0])).toBeLessThan(W);
	});

	it("top border draws a single rule above the content", () => {
		const lines = applyContainerStyle(content, W, { border: "top" }, theme);
		expect(lines).toHaveLength(2);
		expect(stripAnsi(lines[0])).toBe("─".repeat(W));
	});

	it("margins add blank lines", () => {
		const lines = applyContainerStyle(content, W, { marginTop: 1, marginBottom: 2 }, theme);
		expect(lines[0]).toBe("");
		expect(lines.at(-1)).toBe("");
		expect(lines).toHaveLength(4);
	});

	it("background re-arms after inner full resets", () => {
		const [line] = applyContainerStyle("a\x1b[0mb", W, { background: "#303446" }, theme);
		expect(line).toContain("\x1b[0m\x1b[48;2;48;52;70m"); // reset immediately re-armed
		expect(line.startsWith("\x1b[48;2;48;52;70m")).toBe(true);
		expect(line.endsWith("\x1b[49m")).toBe(true);
	});

	it("theme bg names resolve through theme.bg", () => {
		const [line] = applyContainerStyle("x", W, { background: "selectedBg" }, theme);
		expect(line.startsWith("\x1b[48;5;236m")).toBe(true);
	});

	it("multiple content lines share one box", () => {
		const lines = applyContainerStyle(["aa", "bbbb"], W, { border: "single", width: "content" }, theme);
		expect(lines).toHaveLength(4); // top + 2 rows + bottom
		const widths = lines.map((line) => visibleWidth(line));
		expect(new Set(widths).size).toBe(1); // all rows align to the widest
	});

	it("degrades gracefully at tiny widths", () => {
		const lines = applyContainerStyle(content, 10, { border: "rounded", padding: 1 }, theme);
		for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(10);
	});
});

describe("contentWidthFor", () => {
	it("subtracts border columns and padding", () => {
		expect(contentWidthFor(60, {})).toBe(60);
		expect(contentWidthFor(60, { border: "rounded", padding: 2 })).toBe(60 - 2 - 4);
		expect(contentWidthFor(60, { border: "top", padding: 1 })).toBe(60 - 2); // top has no side columns
	});
});
