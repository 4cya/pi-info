import { describe, expect, it } from "bun:test";
import { renderBarParts, renderFooterLines } from "../lib/footer.js";
import { ctx, makeState, stripAnsi, theme } from "./helpers.js";

describe("renderFooterLines", () => {
	it("renders the default single line", () => {
		const lines = renderFooterLines(ctx, theme, 80, makeState(), new Map());
		expect(lines).toHaveLength(1);
		expect(stripAnsi(lines[0])).toBe("claude-opus-4-7  ❯  think:med  ❯  2.6% / 1.0M");
	});

	it("splits bars by per-segment position", () => {
		const state = makeState({
			segmentConfigs: {
				model: { position: "aboveEditor" },
				thinking: { position: "aboveEditor" },
			},
		});
		const above = renderFooterLines(ctx, theme, 80, state, new Map(), "aboveEditor");
		const footer = renderFooterLines(ctx, theme, 80, state, new Map(), "footer");
		expect(stripAnsi(above[0])).toBe("claude-opus-4-7  ❯  think:med");
		expect(stripAnsi(footer[0])).toBe("2.6% / 1.0M");
	});

	it("non-footer bars vanish when empty; footer keeps its line", () => {
		const state = makeState();
		expect(renderFooterLines(ctx, theme, 80, state, new Map(), "belowEditor")).toEqual([]);
		expect(renderFooterLines(ctx, theme, 80, state, new Map(), "footer")).toHaveLength(1);
	});

	it("wrap overflow packs segments at boundaries", () => {
		const lines = renderFooterLines(
			ctx,
			theme,
			30,
			makeState({ style: { overflow: "wrap" } }),
			new Map(),
		);
		expect(lines.length).toBeGreaterThan(1);
		// No segment is split mid-text.
		const texts = lines.map(stripAnsi);
		expect(texts.some((line) => line.includes("claude-opus-4-7"))).toBe(true);
		expect(texts.some((line) => line.includes("2.6% / 1.0M"))).toBe(true);
	});

	it("honors per-segment format templates and order", () => {
		const state = makeState({
			segmentConfigs: {
				model: { format: "M:{name}", order: 2 },
				context: { order: 1 },
			},
		});
		const [line] = renderFooterLines(ctx, theme, 80, state, new Map());
		const text = stripAnsi(line);
		expect(text).toContain("M:claude-opus-4-7");
		expect(text.indexOf("2.6%")).toBeLessThan(text.indexOf("M:claude-opus-4-7"));
	});
});

describe("powerline mode", () => {
	const state = makeState({
		visibleSegments: ["model", "context"],
		segmentConfigs: {
			model: { bg: "#8aadf4", color: "#1e2030" },
			context: { bg: "#494d64" },
		},
		separator: { char: "", mode: "powerline" },
	});

	it("wraps segments in bg blocks with transition arrows", () => {
		const [line] = renderFooterLines(ctx, theme, 80, state, new Map());
		expect(line).toContain("\x1b[48;2;138;173;244m"); // model block bg
		expect(line).toContain("\x1b[48;2;73;77;100m"); // context block bg
		// Arrow into the next block: next bg + previous bg as fg.
		expect(line).toContain("\x1b[48;2;73;77;100m\x1b[38;2;138;173;244m");
		// Final arrow falls back to the default background.
		expect(line).toContain("\x1b[38;2;73;77;100m\x1b[39m");
	});

	it("segments without bg render as plain text", () => {
		const mixed = makeState({
			visibleSegments: ["model", "context"],
			segmentConfigs: { model: { bg: "#8aadf4" } },
			separator: { mode: "powerline" },
		});
		const [line] = renderFooterLines(ctx, theme, 80, mixed, new Map());
		expect(stripAnsi(line)).toContain("2.6% / 1.0M");
	});
});

describe("renderBarParts", () => {
	it("returns keyed parts for the requested bar only", () => {
		const state = makeState({
			segmentConfigs: { model: { position: "editorBottom" } },
		});
		const { parts } = renderBarParts(ctx, theme, state, new Map(), "editorBottom");
		expect(parts.map((part) => part.key)).toEqual(["model"]);
	});
});
