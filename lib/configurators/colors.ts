/**
 * /statusline color — per-segment color overrides. Space cycles presets;
 * Enter opens an inline input for a custom hex or theme color name.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { isValidColor } from "../colors.js";
import { ALL_SEGMENTS, SEGMENT_LABELS, type SegmentName } from "../constants.js";
import { registeredSegments } from "../registry.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

const PRESET_COLORS = [
	"dim", "muted", "text", "accent",
	"#a6adc8", "#89b4fa", "#a6e3a1", "#f38ba8",
	"#fab387", "#f9e2af", "#cba6f7",
];

export async function openColorConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const allNames = [...ALL_SEGMENTS, ...registeredSegments.keys()];
	const segmentColors = deps.getSegmentColors();

	const items: SettingItem[] = allNames.map((name): SettingItem => {
		const provider = registeredSegments.get(name);
		const builtinLabel = SEGMENT_LABELS[name as SegmentName];
		// Dynamic providers may compute their color from ctx; for display we only
		// need a representative default, so a bare context is good enough.
		const defaultColor = provider?.color
			? String(provider.color({} as ExtensionContext))
			: "dim";
		const current = segmentColors[name] ?? defaultColor;
		const hasOverride = name in segmentColors;
		const values = [
			...PRESET_COLORS,
			...(PRESET_COLORS.includes(current) ? [] : [current]),
		];
		return {
			id: `color:${name}`,
			label: `${builtinLabel ?? provider?.label ?? name}${hasOverride ? " *" : ""}`,
			description: `current: ${current}; Enter to type custom`,
			currentValue: current,
			values,
			submenu: (currentValue: string, done: (value?: string) => void) => {
				const input = new Input();
				input.setValue(currentValue);
				input.onSubmit = (value: string) => {
					if (!isValidColor(value)) {
						ctx.ui.notify(`Invalid: "${value}". Use #RRGGBB or theme name.`, "warning");
						return;
					}
					done(value);
				};
				input.onEscape = () => done();
				return input;
			},
		};
	});

	await openSettingsView(ctx, {
		title: "Segment colors",
		subtitle: "Space cycles presets · Enter opens inline input · Esc closes",
		items,
		onChange: (id, newValue) => {
			if (!id.startsWith("color:")) return;
			deps.setSegmentColor(id.slice("color:".length), newValue);
		},
	});
}
