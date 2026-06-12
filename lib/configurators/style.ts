/**
 * /info style — container-level styling: where the statusline lives
 * (footer, above/below the input box), alignment, width, border,
 * background, padding, and margins. Includes one-step style presets.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { isValidColor } from "../colors.js";
import type { StyleConfig } from "../config.js";
import {
	BORDER_STYLES,
	STYLE_ALIGNS,
	STYLE_OVERFLOWS,
	STYLE_POSITIONS,
	STYLE_WIDTHS,
} from "../constants.js";
import { isValidBackground, THEME_BACKGROUNDS } from "../style.js";
import { PRESET_COLORS } from "./colors.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

export const STYLE_PRESETS: { name: string; description: string; style: StyleConfig }[] = [
	{ name: "plain", description: "footer, no decoration — the default", style: {} },
	{ name: "boxed", description: "rounded border around the footer", style: { border: "rounded", padding: 1 } },
	{
		name: "island",
		description: "centered floating bar, shrink-wrapped",
		style: { align: "center", width: "content", border: "rounded", padding: 1 },
	},
	{ name: "top-line", description: "single rule above the footer", style: { border: "top" } },
	{ name: "above-input", description: "plain bar above the input box", style: { position: "aboveEditor" } },
	{ name: "below-input", description: "plain bar below the input box", style: { position: "belowEditor" } },
	{
		name: "merged",
		description: "woven into the input box's bottom border",
		style: { position: "editorBottom" },
	},
];

const POSITION_LABELS: Record<string, string> = {
	footer: "footer (bottom)",
	aboveEditor: "above the input box",
	belowEditor: "below the input box",
	editorTop: "woven into the input box's top border",
	editorBottom: "woven into the input box's bottom border",
};

export async function openStyleConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const style = deps.getStyle();

	const presetName =
		STYLE_PRESETS.find((p) => JSON.stringify(p.style) === JSON.stringify(style))?.name ??
		"custom";

	const inlineInput = (
		currentValue: string,
		validate: (value: string) => string | null,
		done: (value?: string) => void,
	) => {
		const input = new Input();
		input.setValue(currentValue);
		input.onSubmit = (value: string) => {
			const error = validate(value);
			if (error) {
				ctx.ui.notify(error, "warning");
				return;
			}
			done(value);
		};
		input.onEscape = () => done();
		return input;
	};

	const counts = (max: number) => Array.from({ length: max + 1 }, (_, i) => String(i));

	const items: SettingItem[] = [
		{
			id: "style:preset",
			label: "Preset",
			description: STYLE_PRESETS.map((p) => `${p.name}: ${p.description}`).join(" · "),
			currentValue: presetName,
			values: [
				...STYLE_PRESETS.map((p) => p.name),
				...(presetName === "custom" ? ["custom"] : []),
			],
		},
		{
			id: "style:position",
			label: "Position",
			description: "footer replaces pi's footer; widget placements sit next to the input box",
			currentValue: style.position ?? "footer",
			values: [...STYLE_POSITIONS],
		},
		{
			id: "style:align",
			label: "Align",
			description: "full width: aligns the content; content width: aligns the bar",
			currentValue: style.align ?? "left",
			values: [...STYLE_ALIGNS],
		},
		{
			id: "style:width",
			label: "Width",
			description: "full = span the terminal; content = shrink-wrap the segments",
			currentValue: style.width ?? "full",
			values: [...STYLE_WIDTHS],
		},
		{
			id: "style:overflow",
			label: "Overflow",
			description: "overwide content: truncate it or wrap onto more lines at segment boundaries",
			currentValue: style.overflow ?? "truncate",
			values: [...STYLE_OVERFLOWS],
		},
		{
			id: "style:border",
			label: "Border",
			description: "box styles draw 3 lines; top draws a single rule",
			currentValue: style.border ?? "none",
			values: [...BORDER_STYLES],
		},
		{
			id: "style:borderColor",
			label: "Border color",
			description: `current: ${style.borderColor ?? "dim"}; Enter to type custom`,
			currentValue: style.borderColor ?? "dim",
			values: [
				...PRESET_COLORS,
				...(PRESET_COLORS.includes(style.borderColor ?? "dim") ? [] : [style.borderColor ?? "dim"]),
			],
			submenu: (currentValue, done) =>
				inlineInput(
					currentValue,
					(value) =>
						isValidColor(value)
							? null
							: `Invalid: "${value}". Use #RRGGBB or theme name.`,
					done,
				),
		},
		{
			id: "style:background",
			label: "Background",
			description: "theme bg name or #RRGGBB (Enter to type custom)",
			currentValue: style.background ?? "none",
			values: [
				"none",
				...THEME_BACKGROUNDS,
				...(style.background && !(THEME_BACKGROUNDS as readonly string[]).includes(style.background)
					? [style.background]
					: []),
			],
			submenu: (currentValue, done) =>
				inlineInput(
					currentValue === "none" ? "" : currentValue,
					(value) =>
						value === "" || value === "none" || isValidBackground(value)
							? null
							: `Invalid: "${value}". Use #RRGGBB or a theme bg name.`,
					done,
				),
		},
		{
			id: "style:padding",
			label: "Padding",
			description: "spaces between content and the border/background edge",
			currentValue: String(style.padding ?? 0),
			values: counts(4),
		},
		{
			id: "style:marginTop",
			label: "Margin top",
			description: "blank lines above the container",
			currentValue: String(style.marginTop ?? 0),
			values: counts(3),
		},
		{
			id: "style:marginBottom",
			label: "Margin bottom",
			description: "blank lines below the container",
			currentValue: String(style.marginBottom ?? 0),
			values: counts(3),
		},
	];

	await openSettingsView(ctx, {
		title: "Container style",
		subtitle: `position: ${POSITION_LABELS[style.position ?? "footer"]} · Space cycles values · Esc closes`,
		items,
		onChange: (id, newValue) => {
			switch (id) {
				case "style:preset": {
					const preset = STYLE_PRESETS.find((p) => p.name === newValue);
					if (preset) deps.setStyle({ ...preset.style });
					return;
				}
				case "style:position":
					deps.updateStyle({
						position: newValue === "footer" ? undefined : (newValue as StyleConfig["position"]),
					});
					return;
				case "style:align":
					deps.updateStyle({
						align: newValue === "left" ? undefined : (newValue as StyleConfig["align"]),
					});
					return;
				case "style:width":
					deps.updateStyle({
						width: newValue === "full" ? undefined : (newValue as StyleConfig["width"]),
					});
					return;
				case "style:overflow":
					deps.updateStyle({
						overflow: newValue === "truncate" ? undefined : (newValue as StyleConfig["overflow"]),
					});
					return;
				case "style:border":
					deps.updateStyle({
						border: newValue === "none" ? undefined : (newValue as StyleConfig["border"]),
					});
					return;
				case "style:borderColor":
					deps.updateStyle({ borderColor: newValue === "dim" ? undefined : newValue });
					return;
				case "style:background":
					deps.updateStyle({
						background: newValue === "none" || newValue === "" ? undefined : newValue,
					});
					return;
				case "style:padding":
				case "style:marginTop":
				case "style:marginBottom": {
					const key = id.slice("style:".length) as "padding" | "marginTop" | "marginBottom";
					const n = Number.parseInt(newValue, 10);
					deps.updateStyle({ [key]: Number.isFinite(n) && n > 0 ? n : undefined });
					return;
				}
			}
		},
	});
}
