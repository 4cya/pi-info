# pi-info

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center"><img src="assets/cover.png" alt="pi-info cover" width="800" /></p>

A fully customizable statusline for [pi](https://pi.dev). Pluggable segments, priority-based ordering, per-segment colors, and an open registry API — any extension can register its own widget. Ships with model, thinking level, context pressure, spend, and extension-status segments out of the box.

```text
claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k  ❯  ~/projects/app
```

## Features

- **Model awareness** — never accidentally run an expensive model on a typo; the active model is always visible.
- **Thinking level** — instantly notice a wrong reasoning setting.
- **Context pressure** — usage turns green → yellow → red as you approach the window limit.
- **Spend tracking** — optional cost, cache-hit, and token I/O segments.
- **Pluggable segments** — any extension can register its own segment with one function call; pi-info stays a pure display layer.
- **Fully configurable** — toggle, recolor, and reorder every segment from inside pi; settings persist across sessions.

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

| Segment | Shows | Default |
| --- | --- | --- |
| `model` | Active model name | on |
| `thinking` | `think:<level>`, colored by level | on |
| `context` | Context usage % and window size | on |
| `extensions` | Status badges set by other extensions | on |
| `billing` | Cumulative session cost (`$0.412`) | on |
| `cache` | Prompt-cache hit rate (`42%`) | on |
| `io` | Token I/O (`↑12k ↓3.4k`) | on |
| `cwd` | Working directory (`~/projects/app`) | on |
| `branch` | Current git branch (`main`) | on |

Segments hide automatically when they have nothing to show.

## Configuration

<p align="center"><img src="assets/config.png" alt="pi-info configurator TUI" width="700" /></p>

### `/info` command

| Subcommand | What it does |
| --- | --- |
| `/info segments` | Show/hide any segment, including extension statuses |
| `/info color` | Per-segment colors — theme names or `#RRGGBB` |
| `/info order` | Reorder segments |

**Segment visibility:**

<p align="center"><img src="assets/visibility.png" alt="segment visibility toggle" width="600" /></p>

**Color configuration:**

<p align="center"><img src="assets/color.png" alt="color configuration" width="600" /></p>

Settings persist to `~/.pi/agent/pi-info.json` and apply to all sessions.

### Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PI_INFO_SHOW` | Startup default segments | `model,context` |
| `PI_INFO_THRESHOLDS` | Context warning,danger percentages | `70,90` |
| `PI_INFO_CONFIG` | Override config file path | `/tmp/sl.json` |

## Extending: custom segments

pi-info is a display layer: it renders segments, and anything can be a segment. Register one from any pi extension or script:

```ts
import { registerSegment } from "@sentixx/pi-info/extensions/statusline.js";

registerSegment({
	name: "git-branch",
	label: "Git Branch",
	render(ctx) {
		return getBranchSomehow(ctx.cwd); // return null to hide
	},
	color: () => "#89b4fa",
});
```

Registered segments automatically appear in `/info segments`, `color`, and `order`, and their visibility persists. Extensions can also surface lightweight one-off badges through pi's `ctx.ui.setStatus()`, which show up in the `extensions` segment.

## Architecture

```text
extensions/statusline.ts   entry: event wiring, /info command, footer install
lib/
  constants.ts             segment names, labels, defaults
  config.ts                persisted config + env parsing
  colors.ts / text.ts      color + text helpers
  registry.ts              dynamic segment registry (registerSegment API)
  footer.ts                footer line renderer
  status-filter.ts         extension-status filtering
  configurators/           /info TUI configurators
segments/                  SegmentProvider interface + built-in providers
```

## Roadmap

- **Style layer** — declarative separator/prefix/suffix/width per segment in config.
- **Format templates** — `"{model} | {context} | {billing}"` style layout strings.
- **Custom renderers** — point config at your own TS module for full control over the footer line, Claude Code statusline-style.

## Credits & License

MIT. Originated as a rewrite of [pi-bar](https://github.com/tianrendong/pi-bar) by Jenny Yu (MIT); see [LICENSE](LICENSE).
