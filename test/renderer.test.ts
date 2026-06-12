import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderFooterLines } from "../lib/footer.js";
import { getRenderer, loadRenderer } from "../lib/renderer.js";
import { ctx, makeState, theme } from "./helpers.js";

const dir = mkdtempSync(join(tmpdir(), "pi-info-renderer-"));
afterAll(() => {
	rmSync(dir, { recursive: true, force: true });
	// Leave no module loaded for other test files.
	void loadRenderer(undefined);
});

function writeModule(name: string, source: string): string {
	const path = join(dir, name);
	writeFileSync(path, source);
	return path;
}

describe("loadRenderer", () => {
	it("loads a valid module and clears on undefined", async () => {
		const path = writeModule("ok.ts", "export function renderBar() { return null; }");
		expect(await loadRenderer(path)).toBeNull();
		expect(getRenderer()).not.toBeNull();
		await loadRenderer(undefined);
		expect(getRenderer()).toBeNull();
	});

	it("reports modules with no usable exports", async () => {
		const path = writeModule("empty.ts", "export const nothing = 1;");
		expect(await loadRenderer(path)).toContain("exports neither");
		expect(getRenderer()).toBeNull();
	});

	it("reports missing files and keeps the renderer cleared", async () => {
		expect(await loadRenderer(join(dir, "missing.ts"))).toContain("failed to load");
		expect(getRenderer()).toBeNull();
	});
});

describe("renderBar hook", () => {
	it("takes over the targeted bar and falls through elsewhere", async () => {
		const path = writeModule(
			"bar.ts",
			`export function renderBar(bar) {
				if (bar.position !== "footer") return null;
				return [">> " + bar.parts.map((p) => p.key).join(",") + " <<"];
			}`,
		);
		await loadRenderer(path);
		const footer = renderFooterLines(ctx, theme, 80, makeState(), new Map(), "footer");
		expect(footer).toEqual([">> model,thinking,context <<"]);

		// null → default pipeline for other bars
		const state = makeState({ segmentConfigs: { model: { position: "aboveEditor" } } });
		const above = renderFooterLines(ctx, theme, 80, state, new Map(), "aboveEditor");
		expect(above[0]).toContain("claude-opus-4-7");
		await loadRenderer(undefined);
	});

	it("a throwing renderer falls back to the default pipeline", async () => {
		const path = writeModule("boom.ts", 'export function renderBar() { throw new Error("boom"); }');
		await loadRenderer(path);
		const lines = renderFooterLines(ctx, theme, 80, makeState(), new Map(), "footer");
		expect(lines[0]).toContain("claude-opus-4-7");
		await loadRenderer(undefined);
	});
});
