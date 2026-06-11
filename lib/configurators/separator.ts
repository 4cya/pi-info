/**
 * /info separator — the string and color drawn between segments.
 * Space cycles presets; Enter opens an inline input for a custom value.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { isValidColor } from "../colors.js";
import { stripTerminalControls } from "../text.js";
import { PRESET_COLORS } from "./colors.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

const PRESET_SEPARATORS = ["❯", "│", "|", "·", "•", "→", "»", "/", ""];
const MAX_SEPARATOR_WIDTH = 4;

export async function openSeparatorConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const { char, color, mode } = deps.getSeparator();

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

	const items: SettingItem[] = [
		{
			id: "sep:mode",
			label: "Mode",
			description: "char: plain separator; powerline: arrow transition between segment bg blocks",
			currentValue: mode,
			values: ["char", "powerline"],
		},
		{
			id: "sep:char",
			label: "Separator",
			description: `current: "${char}"; Enter to type custom (empty = spaces only)`,
			currentValue: char,
			values: [
				...PRESET_SEPARATORS,
				...(PRESET_SEPARATORS.includes(char) ? [] : [char]),
			],
			submenu: (currentValue, done) =>
				inlineInput(
					currentValue,
					(value) =>
						stripTerminalControls(value).length > MAX_SEPARATOR_WIDTH
							? `Too long: keep it under ${MAX_SEPARATOR_WIDTH + 1} characters.`
							: null,
					done,
				),
		},
		{
			id: "sep:color",
			label: "Separator color",
			description: `current: ${color}; Enter to type custom`,
			currentValue: color,
			values: [
				...PRESET_COLORS,
				...(PRESET_COLORS.includes(color) ? [] : [color]),
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
	];

	await openSettingsView(ctx, {
		title: "Segment separator",
		subtitle: "Space cycles presets · Enter opens inline input · Esc closes",
		items,
		onChange: (id, newValue) => {
			if (id === "sep:mode") deps.setSeparatorMode(newValue as "char" | "powerline");
			if (id === "sep:char") deps.setSeparator(stripTerminalControls(newValue));
			if (id === "sep:color") deps.setSeparatorColor(newValue);
		},
	});
}
