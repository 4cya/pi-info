# pi-statusline

[English](README.md) | [简体中文](README.zh-CN.md)

A modular, fully configurable statusline for [pi](https://pi.dev). Everything you need to see at a glance — active model, thinking level, context pressure, spend, and extension statuses — in one calm footer line.

```text
claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k  ❯  ~/projects/app
```

## Features

- **Model awareness** — never accidentally run an expensive model on a typo; the active model is always visible.
- **Thinking level** — instantly notice a wrong reasoning setting.
- **Context pressure** — usage turns green → yellow → red as you approach the window limit.
- **Spend tracking** — optional cost, cache-hit, and token I/O segments.
- **Pluggable segments** — any extension can register its own segment with one function call; pi-statusline stays a pure display layer.
- **Fully configurable** — toggle, recolor, and reorder every segment from inside pi; settings persist across sessions.

## Quick start

```bash
pi install npm:pi-statusline
```

Already running? `/reload`, then open the configurator:

```text
/statusline
```

## Segments

| Segment | Shows | Default |
| --- | --- | --- |
| `model` | Active model name | on |
| `thinking` | `think:<level>`, colored by level | on |
| `context` | Context usage % and window size | on |
| `extensions` | Status badges set by other extensions | on |
| `billing` | Cumulative session cost (`$0.412`) | on |
| `cache` | Prompt-cache read/write tokens (`R12k W3.4k`) | on |
| `io` | Token I/O (`↑12k ↓3.4k`) | on |
| `cwd` | Working directory (`~/projects/app`) | on |

Segments hide automatically when they have nothing to show.

## Configuration

### `/statusline` command

| Subcommand | What it does |
| --- | --- |
| `/statusline segments` | Show/hide any segment, including extension statuses |
| `/statusline status` | Fine-grained filter for extension status keys |
| `/statusline color` | Per-segment colors — theme names or `#RRGGBB` |
| `/statusline order` | Reorder segments |
| `/statusline list` | Print current config |

Settings persist to `~/.pi/agent/pi-statusline.json` and apply to all sessions.

### Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PI_STATUSLINE_SHOW` | Startup default segments | `model,context` |
| `PI_STATUSLINE_THRESHOLDS` | Context warning,danger percentages | `70,90` |
| `PI_STATUSLINE_CONFIG` | Override config file path | `/tmp/sl.json` |

## Extending: custom segments

pi-statusline is a display layer: it renders segments, and anything can be a segment. Register one from any pi extension or script:

```ts
import { registerSegment } from "pi-statusline/extensions/statusline.js";

registerSegment({
	name: "git-branch",
	label: "Git Branch",
	render(ctx) {
		return getBranchSomehow(ctx.cwd); // return null to hide
	},
	color: () => "#89b4fa",
});
```

Registered segments automatically appear in `/statusline segments`, `color`, and `order`, and their visibility persists. Extensions can also surface lightweight one-off badges through pi's `ctx.ui.setStatus()`, which show up in the `extensions` segment.

## Architecture

```text
extensions/statusline.ts   entry: event wiring, /statusline command, footer install
lib/
  constants.ts             segment names, labels, defaults
  config.ts                persisted config + env parsing
  colors.ts / text.ts      color + text helpers
  registry.ts              dynamic segment registry (registerSegment API)
  footer.ts                footer line renderer
  status-filter.ts         extension-status filtering
  configurators/           /statusline TUI configurators
segments/                  SegmentProvider interface + built-in providers
```

## Roadmap

- **Style layer** — declarative separator/prefix/suffix/width per segment in config.
- **Format templates** — `"{model} | {context} | {billing}"` style layout strings.
- **Custom renderers** — point config at your own TS module for full control over the footer line, Claude Code statusline-style.

## Credits & License

MIT. Originated as a rewrite of [pi-bar](https://github.com/tianrendong/pi-bar) by Jenny Yu (MIT); see [LICENSE](LICENSE).
