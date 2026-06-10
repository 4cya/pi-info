/**
 * /info format — per-segment format templates. Shows each segment's
 * available variables; Enter opens an inline input for the template.
 * Submitting an empty value restores the segment's default.
 *
 * Template syntax (lib/template.ts):
 *   {var}  [text](color bold …)  (optional group)  \escape
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Input, type SettingItem } from "@earendil-works/pi-tui";
import { ALL_SEGMENTS, SEGMENT_LABELS, type SegmentName } from "../constants.js";
import { registeredSegments } from "../registry.js";
import { parseTemplate } from "../template.js";
import type { ConfiguratorDeps } from "./deps.js";
import { openSettingsView } from "./view.js";

/** Variables and default formats for the built-in (non-registry) segments. */
const BUILTIN_TEMPLATE_INFO: Record<SegmentName, { vars: string[]; defaultFormat: string }> = {
	model: { vars: ["name", "id"], defaultFormat: "{name}" },
	thinking: { vars: ["level"], defaultFormat: "think:{level}" },
	context: { vars: ["percent", "window"], defaultFormat: "{percent}% / {window}" },
	extensions: { vars: ["key", "text"], defaultFormat: "{key}:{text}" },
};

export async function openFormatConfigurator(
	ctx: ExtensionContext,
	deps: ConfiguratorDeps,
): Promise<void> {
	const configs = deps.getSegmentConfigs();

	const entries: { name: string; label: string; vars: string[]; defaultFormat: string }[] = [
		...ALL_SEGMENTS.map((name) => ({
			name: name as string,
			label: SEGMENT_LABELS[name],
			...BUILTIN_TEMPLATE_INFO[name],
		})),
		...Array.from(registeredSegments.entries()).map(([name, provider]) => {
			let vars = ["output"];
			if (provider.data) {
				try {
					const sample = provider.data(ctx);
					if (sample) vars = Object.keys(sample);
				} catch {
					// Fall back to {output}.
				}
			}
			return {
				name,
				label: provider.label,
				vars,
				defaultFormat: provider.defaultFormat ?? "{output}",
			};
		}),
	];

	const items: SettingItem[] = entries.map((entry): SettingItem => {
		const current = configs[entry.name]?.format;
		const varList = entry.vars.map((v) => `{${v}}`).join(" ");
		return {
			id: `format:${entry.name}`,
			label: `${entry.label}${current !== undefined ? " *" : ""}`,
			description: `vars: ${varList} · empty input restores default`,
			currentValue: current ?? entry.defaultFormat,
			values: [],
			submenu: (currentValue: string, done: (value?: string) => void) => {
				const input = new Input();
				input.setValue(currentValue);
				input.onSubmit = (value: string) => {
					if (value) {
						try {
							parseTemplate(value);
						} catch (error) {
							ctx.ui.notify(
								`Invalid template: ${error instanceof Error ? error.message : String(error)}`,
								"warning",
							);
							return;
						}
					}
					done(value);
				};
				input.onEscape = () => done();
				return input;
			},
		};
	});

	await openSettingsView(ctx, {
		title: "Segment formats",
		subtitle: "Enter to edit template · {var} [text](style) (group) · Esc closes",
		items,
		onChange: (id, newValue) => {
			if (!id.startsWith("format:")) return;
			const name = id.slice("format:".length);
			deps.updateSegmentConfig(name, { format: newValue || undefined });
		},
	});
}
