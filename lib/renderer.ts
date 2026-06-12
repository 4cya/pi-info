/**
 * Custom renderer hook: `style.renderer` points at a user module that can
 * take over the final rendering of any bar or editor-border embed — full
 * styling control without touching this package.
 *
 *   // ~/.pi/agent/pi-info.json
 *   "style": { "renderer": "/home/me/.pi/my-renderer.ts" }
 *
 *   // my-renderer.ts
 *   import type { BarRenderInput } from "@sentixx/pi-info/extensions/statusline.js";
 *   export function renderBar(bar: BarRenderInput): string[] | string | null {
 *     if (bar.position !== "footer") return null;   // null = default pipeline
 *     return [`>> ${bar.parts.map((p) => p.text).join(" | ")}`];
 *   }
 *
 * Hooks return null/undefined to fall through to the default pipeline, so
 * a renderer can override exactly one bar and leave the rest alone. A
 * module that fails to load or throws mid-render is skipped — the
 * statusline never breaks because of a user renderer.
 */

import { pathToFileURL } from "node:url";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { StyleConfig } from "./config.js";
import type { StyleAlign, StylePosition } from "./constants.js";

export type BarRenderInput = {
	position: StylePosition;
	/** Rendered segments in display order: key + colored text. */
	parts: { key: string; text: string }[];
	/** The configured separator string, already colored. */
	separator: string;
	/** Terminal width. */
	width: number;
	theme: Theme;
	style: StyleConfig;
};

export type EdgeRenderInput = {
	edge: "top" | "bottom";
	position: StylePosition;
	parts: { key: string; text: string }[];
	separator: string;
	width: number;
	theme: Theme;
	align: StyleAlign;
	/** Colors text like the editor's border, e.g. for "─" fills. */
	rule: (s: string) => string;
};

export type RendererModule = {
	/** Final lines for a bar; null/undefined falls through to the default. */
	renderBar?(bar: BarRenderInput): string[] | string | null | undefined;
	/** Final line for an editor-border embed; null/undefined falls through. */
	renderEdge?(edge: EdgeRenderInput): string | null | undefined;
};

let current: RendererModule | null = null;

export function getRenderer(): RendererModule | null {
	return current;
}

/**
 * (Re)loads the renderer module; clears it when path is unset or loading
 * fails. The timestamp query busts the ESM cache so edits to the module
 * are picked up on the next session/config reload.
 */
export async function loadRenderer(path: string | undefined): Promise<string | null> {
	current = null;
	if (!path) return null;
	try {
		const url = `${pathToFileURL(path).href}?t=${Date.now()}`;
		const mod = (await import(url)) as RendererModule;
		if (typeof mod.renderBar !== "function" && typeof mod.renderEdge !== "function") {
			return `renderer loaded but exports neither renderBar nor renderEdge: ${path}`;
		}
		current = mod;
		return null;
	} catch (error) {
		return `failed to load renderer ${path}: ${error instanceof Error ? error.message : String(error)}`;
	}
}
