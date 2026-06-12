import { describe, expect, it } from "bun:test";
import { applyStylePatch, sanitizeStyleConfig } from "../lib/config.js";

describe("sanitizeStyleConfig", () => {
	it("keeps valid values and clamps numbers", () => {
		expect(
			sanitizeStyleConfig({
				position: "aboveEditor",
				border: "rounded",
				padding: 99,
				marginTop: -3,
				background: "#303446",
				bogus: 1,
			}),
		).toEqual({
			position: "aboveEditor",
			border: "rounded",
			padding: 8,
			marginTop: 0,
			background: "#303446",
		});
	});

	it("accepts the editor-embed positions and overflow", () => {
		expect(sanitizeStyleConfig({ position: "editorBottom", overflow: "wrap" })).toEqual({
			position: "editorBottom",
			overflow: "wrap",
		});
	});

	it("drops unknown enum values", () => {
		expect(sanitizeStyleConfig({ position: "sideways", border: "zigzag", padding: "two" })).toEqual({});
	});

	it("returns {} for non-object input", () => {
		expect(sanitizeStyleConfig("garbage")).toEqual({});
		expect(sanitizeStyleConfig(null)).toEqual({});
		expect(sanitizeStyleConfig([1, 2])).toEqual({});
	});

	it("keeps the renderer path", () => {
		expect(sanitizeStyleConfig({ renderer: "/tmp/r.ts" })).toEqual({ renderer: "/tmp/r.ts" });
	});
});

describe("applyStylePatch", () => {
	it("merges values and deletes undefined keys", () => {
		expect(applyStylePatch({ border: "rounded", padding: 1 }, { border: undefined, align: "center" })).toEqual({
			padding: 1,
			align: "center",
		});
	});
});
