import { describe, expect, it } from "bun:test";
import {
	animatedUsed,
	applyEffect,
	beginEffectTracking,
	isEffectSpec,
	registerEffect,
	resolveEffect,
	unregisterEffect,
} from "../lib/effects.js";
import { stripAnsi } from "./helpers.js";

describe("resolveEffect", () => {
	it("resolves built-ins and parameterized specs", () => {
		expect(resolveEffect("rainbow")).not.toBeNull();
		expect(resolveEffect("rainbow-flow")?.intervalMs).toBeGreaterThan(0);
		expect(resolveEffect("gradient:#89b4fa..#f38ba8")).not.toBeNull();
		expect(resolveEffect("gradient-flow:#89b4fa..#cba6f7..#f38ba8")?.intervalMs).toBeGreaterThan(0);
		expect(resolveEffect("pulse:#89b4fa")?.intervalMs).toBeGreaterThan(0);
		expect(resolveEffect("wave:#89b4fa")?.intervalMs).toBeGreaterThan(0);
	});

	it("rejects malformed specs", () => {
		expect(isEffectSpec("notaneffect")).toBe(false);
		expect(isEffectSpec("gradient:#zz0000..#f38ba8")).toBe(false);
		expect(isEffectSpec("gradient:#f38ba8")).toBe(false); // needs 2+ stops
		expect(isEffectSpec("pulse:red")).toBe(false);
		expect(isEffectSpec("dim")).toBe(false); // theme colors are not effects
	});

	it("rainbow produces distinct hues across positions", () => {
		const fx = resolveEffect("rainbow")!;
		const hues = new Set([0, 3, 6, 9, 12].map((i) => fx.colorAt(i, 15, 0)));
		expect(hues.size).toBe(5);
	});

	it("rainbow-flow stays valid at large wall-clock times (negative-hue fix)", () => {
		const fx = resolveEffect("rainbow-flow")!;
		const now = Date.now() / 1000;
		const colors = [0, 5, 10].map((i) => fx.colorAt(i, 15, now));
		for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
		expect(new Set(colors).size).toBe(3); // not collapsed to one color
	});

	it("flow phase moves over time", () => {
		const fx = resolveEffect("rainbow-flow")!;
		expect(fx.colorAt(0, 10, 0)).not.toBe(fx.colorAt(0, 10, 1));
	});
});

describe("applyEffect", () => {
	it("colors per grapheme and keeps CJK/emoji intact", () => {
		const out = applyEffect(resolveEffect("rainbow")!, "状态栏👨‍👩‍👧测试");
		expect(stripAnsi(out)).toBe("状态栏👨‍👩‍👧测试");
		expect(out).toContain("👨‍👩‍👧"); // ZWJ emoji not split
	});

	it("leaves spaces uncolored", () => {
		const out = applyEffect(resolveEffect("rainbow")!, "a b");
		expect(out).toMatch(/\x1b\[39m \x1b\[38;2;/); // bare space between colored runs
		expect(stripAnsi(out)).toBe("a b");
	});
});

describe("animation tracking", () => {
	it("reports null for static effects, interval for animated", () => {
		beginEffectTracking();
		applyEffect(resolveEffect("rainbow")!, "abc");
		expect(animatedUsed()).toBeNull();
		applyEffect(resolveEffect("wave:#89b4fa")!, "abc");
		expect(animatedUsed()).toEqual({ intervalMs: 100 });
	});

	it("resets per render pass", () => {
		beginEffectTracking();
		applyEffect(resolveEffect("pulse:#89b4fa")!, "abc");
		expect(animatedUsed()).not.toBeNull();
		beginEffectTracking();
		expect(animatedUsed()).toBeNull();
	});
});

describe("registerEffect", () => {
	it("registers custom effects resolvable by name", () => {
		registerEffect("test-flag", { colorAt: () => "#ff0000" });
		expect(isEffectSpec("test-flag")).toBe(true);
		expect(stripAnsi(applyEffect(resolveEffect("test-flag")!, "ab"))).toBe("ab");
		unregisterEffect("test-flag");
		expect(isEffectSpec("test-flag")).toBe(false);
	});

	it("rejects invalid registrations", () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing bad input
		expect(() => registerEffect("bad", {} as any)).toThrow();
	});
});
