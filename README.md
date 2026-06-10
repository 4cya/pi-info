# pi-info

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center"><img src="assets/cover.png" alt="pi-info cover" width="800" /></p>

A fully customizable statusline for [pi](https://pi.dev). Starship-style format templates, pluggable segments, priority-based ordering, per-segment colors, shell-command segments, and an open registry API — any extension can register its own widget. Ships with model, thinking level, context pressure, spend, and extension-status segments out of the box.

```text
claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k  ❯  ~/projects/app
```

## Features

- **Model awareness** — never accidentally run an expensive model on a typo; the active model is always visible.
- **Thinking level** — instantly notice a wrong reasoning setting.
- **Context pressure** — usage turns green → yellow → red as you approach the window limit.
- **Spend tracking** — optional cost, cache-hit, and token I/O segments.
- **Format templates** — restyle any segment with starship-style templates: `{var}` interpolation, `[text](style)` spans, optional groups. Drop in Nerd Font icons or emoji.
- **Shell-command segments** — one config entry turns any command's stdout into a segment.
- **Pluggable segments** — any extension can register its own segment with one function call; pi-info stays a pure display layer.
- **Fully configurable** — toggle, recolor, reorder, and reformat every segment from inside pi; settings persist across sessions.

<p align="center"><img src="assets/basic.png" alt="pi-info statusline in action" width="700" /></p>

## Quick start

```bash
pi install npm:@sentixx/pi-info
```

Already running? `/reload`, then open the configurator:

```text
/info
```

## Segments

| Segment | Shows | Variables | Default format |
| --- | --- | --- | --- |
| `model` | Active model name | `{name}` `{id}` | `{name}` |
| `thinking` | Reasoning level, colored by level | `{level}` | `think:{level}` |
| `context` | Context usage, green → yellow → red | `{percent}` `{window}` | `{percent}% / {window}` |
| `extensions` | Status badges set by other extensions | `{key}` `{text}` | `{key}:{text}` |
| `billing` | Cumulative session cost | `{cost}` | `${cost}` |
| `cache` | Prompt-cache hit rate | `{percent}` | `{percent}%` |
| `io` | Cumulative token I/O | `{input}` `{output}` `{total}` | `(↑{input}  )(↓{output})` |
| `cwd` | Working directory | `{dir}` | `{dir}` |
| `branch` | Current git branch | `{branch}` | `{branch}` |

Segments hide automatically when they have nothing to show.

## Configuration

<p align="center"><img src="assets/config.png" alt="pi-info configurator TUI" width="700" /></p>

### `/info` command

| Subcommand | What it does |
| --- | --- |
| `/info segments` | Show/hide any segment, including extension statuses |
| `/info color` | Per-segment colors — theme names or `#RRGGBB` |
| `/info order` | Reorder segments |
| `/info separator` | Change the separator between segments (string + color) |
| `/info format` | Edit per-segment format templates |
| `/info preset` | Apply a format preset (`plain` / `nerd` / `emoji`) in one step |

**Segment visibility:**

<p align="center"><img src="assets/visibility.png" alt="segment visibility toggle" width="600" /></p>

**Color configuration:**

<p align="center"><img src="assets/color.png" alt="color configuration" width="600" /></p>

### Config file

Settings persist to `~/.pi/agent/pi-info.json` — one object per segment:

```json
{
  "separator": { "char": "❯", "color": "dim" },
  "segments": {
    "model":   { "format": " {name}", "color": "accent", "order": 1 },
    "context": { "format": "[{percent}%](auto bold) · {window}" },
    "io":      false,
    "weather": { "command": "curl -s 'wttr.in?format=%t'", "interval": 300 }
  }
}
```

Per-segment keys (all optional):

| Key | Meaning |
| --- | --- |
| `format` | Template string; omit for the segment's default |
| `color` | Base color for untemplated text — theme name or `#RRGGBB` |
| `order` | Priority, lower = earlier (default 999) |
| `hidden` | Hide the segment; `"name": false` is shorthand |
| `command` | Shell command whose stdout becomes `{output}` — defines a custom segment |
| `interval` | Cache command output for N seconds (default 60) |
| `label` | Display name in `/info` for command segments |

### Format templates

```text
{var}            variable interpolation
[text](style)    styled span — color (#RRGGBB / theme name), "auto",
                 and bold / italic / underline, space-separated
(group)          optional group: skipped when every {var} inside is empty
\x               escape any syntax character
```

`auto` resolves to the segment's semantic color — context keeps its
threshold color and thinking its level color even inside custom formats.
Any Unicode works: Nerd Font glyphs, emoji, powerline characters.

```json
"context": "[{percent}%](auto) [of](dim) {window}",
"branch":  "[](#f34f29) {branch}",
"io":      "(⬆{input}  )(⬇{output})"
```

### Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PI_INFO_SHOW` | Startup default segments | `model,context` |
| `PI_INFO_THRESHOLDS` | Context warning,danger percentages | `70,90` |
| `PI_INFO_CONFIG` | Override config file path | `/tmp/sl.json` |

## Extending: custom segments

Anything can be a segment. The zero-code path is a `command` entry in the config (see above). For full control, register one from any pi extension or script:

```ts
import { registerSegment } from "@sentixx/pi-info/extensions/statusline.js";

registerSegment({
	name: "review-queue",
	label: "Review Queue",
	// Expose template variables so users can reformat your segment:
	data(ctx) {
		const count = getQueueCountSomehow();
		return count > 0 ? { count: String(count) } : null; // null hides
	},
	defaultFormat: "{count} reviews",
	color: () => "#89b4fa",
});
```

Segments that only implement `render()` still work — their output is exposed to templates as `{output}`. Registered segments automatically appear in `/info segments`, `color`, `order`, and `format`, and their settings persist. Extensions can also surface lightweight one-off badges through pi's `ctx.ui.setStatus()`, which show up in the `extensions` segment.

## Architecture

```text
extensions/statusline.ts   entry: event wiring, /info command, footer install
lib/
  constants.ts             segment names, labels, defaults
  config.ts                persisted per-segment config + env parsing
  template.ts              format template engine ({var}, [..](style), groups)
  colors.ts / text.ts      color + text helpers
  presets.ts               one-step format presets
  registry.ts              dynamic segment registry (registerSegment API)
  footer.ts                footer line renderer
  status-filter.ts         extension-status filtering
  configurators/           /info TUI configurators
segments/                  SegmentProvider interface + built-in providers
```

## Roadmap

- **Custom renderers** — point config at your own TS module for full control over the footer line, Claude Code statusline-style.

## Credits & License

MIT. Originated as a rewrite of [pi-bar](https://github.com/tianrendong/pi-bar) by Jenny Yu (MIT); see [LICENSE](LICENSE).
