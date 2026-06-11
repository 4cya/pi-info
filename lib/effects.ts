/**
 * Text effects: multi-color and animated coloring for segment text.
 *
 * An effect colors text per-grapheme as a function of character position
 * and (for animated effects) wall-clock time. Effect names are accepted
 * anywhere a color is: the `color` config key and `[text](style)` template
 * spans. Like segments, effects are an open registry — extensions can add
 * their own via registerEffect().
 *
 * Built-in effects:
 *   rainbow                     hue sweep across the text
 *   rainbow-flow                rainbow drifting over time
 *   gradient:#a..#b[..#c…]      multi-stop gradient across the text
 *   gradient-flow:#a..#b[..…]   gradient drifting over time
 *   pulse:#RRGGBB               whole text breathing in brightness
 *   wave:#RRGGBB                brightness wave rolling through the text
 *
 * Animated effects only advance while something re-renders; the extension
 * runs a ticker whenever the last render used one (see animatedUsed()).
 */

export type TextEffect = {
	/** Hex color for grapheme i of n at time t (seconds). */
	colorAt(i: number, n: number, t: number): string;
	/** Frame interval in ms; omit for static effects. */
	intervalMs?: number;
};

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function hsl(h: number, s: number, l: number): string {
	h = ((h % 360) + 360) % 360;
	const a = s * Math.min(l, 1 - l);
	const f = (k: number) => {
		const x = (k + h / 30) % 12;
		return l - a * Math.max(-1, Math.min(x - 3, Math.min(9 - x, 1)));
	};
	const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
	return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function parseHex(hex: string): [number, number, number] {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16),
	];
}

function mix(a: string, b: string, ratio: number): string {
	const [ar, ag, ab] = parseHex(a);
	const [br, bg, bb] = parseHex(b);
	const to = (x: number, y: number) =>
		Math.round(x + (y - x) * ratio).toString(16).padStart(2, "0");
	return `#${to(ar, br)}${to(ag, bg)}${to(ab, bb)}`;
}

/** Position 0..1 → color along a multi-stop gradient. */
function gradientAt(stops: string[], pos: number): string {
	if (stops.length === 1) return stops[0];
	const scaled = Math.min(0.9999, Math.max(0, pos)) * (stops.length - 1);
	const idx = Math.floor(scaled);
	return mix(stops[idx], stops[idx + 1], scaled - idx);
}

function scale(hex: string, factor: number): string {
	const [r, g, b] = parseHex(hex);
	const to = (v: number) =>
		Math.round(Math.min(255, v * factor)).toString(16).padStart(2, "0");
	return `#${to(r)}${to(g)}${to(b)}`;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Splits "#a..#b..#c" into stops; null when any stop is invalid. */
function parseStops(spec: string): string[] | null {
	const stops = spec.split("..").map((s) => s.trim());
	return stops.length >= 2 && stops.every((s) => HEX_RE.test(s)) ? stops : null;
}

// Fixed-name effects.
const EFFECTS = new Map<string, TextEffect>([
	["rainbow", {
		colorAt: (i, n) => hsl((i / Math.max(1, n)) * 360, 0.85, 0.62),
	}],
	["rainbow-flow", {
		colorAt: (i, n, t) => hsl(((i / Math.max(1, n)) - t * 0.25) * 360, 0.85, 0.62),
		intervalMs: 120,
	}],
]);

/**
 * Registers a custom effect (or overrides a built-in). Parameterized specs
 * ("name:args") resolve by the part before the colon, with the full spec
 * passed through resolveEffect's parameterized branch first — fixed names
 * registered here win only for exact matches.
 */
export function registerEffect(name: string, effect: TextEffect): void {
	if (!name || typeof effect?.colorAt !== "function") {
		throw new Error("registerEffect: name and colorAt are required");
	}
	EFFECTS.set(name, effect);
}

export function unregisterEffect(name: string): void {
	EFFECTS.delete(name);
}

/** Resolves an effect spec (fixed name or "name:params") or null. */
export function resolveEffect(spec: string): TextEffect | null {
	const fixed = EFFECTS.get(spec);
	if (fixed) return fixed;

	const sep = spec.indexOf(":");
	if (sep === -1) return null;
	const kind = spec.slice(0, sep);
	const params = spec.slice(sep + 1);

	if (kind === "gradient" || kind === "gradient-flow") {
		const stops = parseStops(params);
		if (!stops) return null;
		if (kind === "gradient") {
			return { colorAt: (i, n) => gradientAt(stops, n <= 1 ? 0 : i / (n - 1)) };
		}
		return {
			colorAt: (i, n, t) => gradientAt(stops, (i / Math.max(1, n) + t * 0.2) % 1),
			intervalMs: 120,
		};
	}
	if (kind === "pulse" && HEX_RE.test(params)) {
		return {
			colorAt: (_i, _n, t) => scale(params, 0.65 + 0.35 * Math.sin(t * 2.5)),
			intervalMs: 120,
		};
	}
	if (kind === "wave" && HEX_RE.test(params)) {
		return {
			colorAt: (i, _n, t) => scale(params, 0.55 + 0.45 * Math.sin(i * 0.7 - t * 4)),
			intervalMs: 100,
		};
	}
	return null;
}

export function isEffectSpec(spec: string): boolean {
	return resolveEffect(spec) !== null;
}

// Whether the most recent render pass used an animated effect — the
// extension polls this after each render to start/stop its ticker.
let animatedThisRender = false;
let minInterval = Infinity;

export function beginEffectTracking(): void {
	animatedThisRender = false;
	minInterval = Infinity;
}

export function animatedUsed(): { intervalMs: number } | null {
	return animatedThisRender ? { intervalMs: Math.max(50, minInterval) } : null;
}

/** Colors text per-grapheme with the effect. Time comes from the wall clock. */
export function applyEffect(effect: TextEffect, text: string): string {
	const graphemes = Array.from(segmenter.segment(text), (s) => s.segment);
	if (effect.intervalMs) {
		animatedThisRender = true;
		minInterval = Math.min(minInterval, effect.intervalMs);
	}
	const t = Date.now() / 1000;
	const n = graphemes.length;
	let visibleIndex = 0;
	return graphemes
		.map((g) => {
			// Spaces take a position slot but need no escape codes.
			if (g.trim() === "") {
				visibleIndex++;
				return g;
			}
			const hex = effect.colorAt(visibleIndex++, n, t);
			const [r, gg, b] = parseHex(hex);
			return `\x1b[38;2;${r};${gg};${b}m${g}\x1b[39m`;
		})
		.join("");
}
