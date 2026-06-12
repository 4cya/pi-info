import { describe, expect, it } from "bun:test";
import {
	applyColor,
	bgEscapePair,
	bgEscapeToFg,
	isValidBackground,
	isValidColor,
} from "../lib/colors.js";
import { stripAnsi, theme } from "./helpers.js";

describe("isValidColor", () => {
	it("accepts theme names, hex, and effect specs", () => {
		expect(isValidColor("dim")).toBe(true);
		expect(isValidColor("#a6e3a1")).toBe(true);
		expect(isValidColor("rainbow")).toBe(true);
		expect(isValidColor("gradient:#89b4fa..#f38ba8")).toBe(true);
		expect(isValidColor("nonsense")).toBe(false);
	});
});

describe("isValidBackground", () => {
	it("accepts hex and theme bg names only", () => {
		expect(isValidBackground("#303446")).toBe(true);
		expect(isValidBackground("selectedBg")).toBe(true);
		expect(isValidBackground("accent")).toBe(false);
		expect(isValidBackground("rainbow")).toBe(false);
	});
});

describe("bgEscapePair", () => {
	it("builds truecolor escapes for hex", () => {
		expect(bgEscapePair("#8aadf4", theme)).toEqual({
			on: "\x1b[48;2;138;173;244m",
			off: "\x1b[49m",
		});
	});

	it("extracts the theme's escape pair for bg names", () => {
		expect(bgEscapePair("selectedBg", theme)).toEqual({
			on: "\x1b[48;5;236m",
			off: "\x1b[49m",
		});
	});

	it("returns null for invalid colors", () => {
		expect(bgEscapePair("nope", theme)).toBeNull();
	});
});

describe("bgEscapeToFg", () => {
	it("converts every bg escape form to its fg equivalent", () => {
		expect(bgEscapeToFg("\x1b[48;2;1;2;3m")).toBe("\x1b[38;2;1;2;3m");
		expect(bgEscapeToFg("\x1b[48;5;236m")).toBe("\x1b[38;5;236m");
		expect(bgEscapeToFg("\x1b[44m")).toBe("\x1b[34m");
		expect(bgEscapeToFg("\x1b[104m")).toBe("\x1b[94m");
	});
});

describe("applyColor", () => {
	it("renders hex as truecolor fg", () => {
		expect(applyColor("#ff0000", theme, "x")).toBe("\x1b[38;2;255;0;0mx\x1b[39m");
	});

	it("routes theme names through theme.fg", () => {
		expect(applyColor("dim", theme, "x")).toBe("\x1b[2mx\x1b[0m");
	});

	it("routes effect specs through the effect engine", () => {
		const out = applyColor("rainbow", theme, "abc");
		expect(stripAnsi(out)).toBe("abc");
		expect(out).toContain("\x1b[38;2;"); // per-char truecolor
	});
});
