/**
 * Shared TUI scaffolding for the /info configurators: a titled
 * SettingsList inside ctx.ui.custom with search enabled.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList, type SettingItem } from "@earendil-works/pi-tui";

export type SettingsViewOptions = {
	title: string;
	subtitle: string;
	items: SettingItem[];
	maxRows?: number;
	/** Return "close" to dismiss the view after handling the change. */
	onChange: (id: string, newValue: string) => void | "close";
};

export async function openSettingsView(
	ctx: ExtensionContext,
	options: SettingsViewOptions,
): Promise<void> {
	await ctx.ui.custom((tui, theme, _kb, done) => {
		const container = new Container();
		container.addChild(
			new (class {
				render(_width: number) {
					return [
						theme.fg("accent", theme.bold(options.title)),
						theme.fg("dim", options.subtitle),
						"",
					];
				}
				invalidate() {}
			})(),
		);

		const settingsList = new SettingsList(
			options.items,
			Math.min(options.items.length + 2, options.maxRows ?? 18),
			getSettingsListTheme(),
			(id: string, newValue: string) => {
				if (options.onChange(id, newValue) === "close") done(undefined);
			},
			() => done(undefined),
			{ enableSearch: true },
		);

		container.addChild(settingsList);

		return {
			render(width: number) {
				return container.render(width);
			},
			invalidate() {
				container.invalidate();
			},
			handleInput(data: string) {
				settingsList.handleInput?.(data);
				tui.requestRender();
			},
		};
	});
}
