# pi-info

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center"><img src="assets/cover.png" alt="pi-info cover" width="800" /></p>

[pi](https://pi.dev) 的完全可定制状态栏。starship 风格的格式模板、可插拔 segment、优先级排序、逐段配色、shell 命令 segment，外加开放注册 API——任何扩展都能注册自己的组件。内置模型、思考等级、上下文压力、花费、扩展状态等开箱即用的 segment。

```text
claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k  ❯  ~/projects/app
```

## 特性

- **模型可见** —— 不再因为手滑把贵的模型用在小事上，当前模型始终在眼前。
- **思考等级** —— 推理档位设错时立刻发现。
- **上下文压力** —— 用量随接近窗口上限由绿转黄再转红。
- **花费追踪** —— 可选的成本、缓存命中、token 输入输出段。
- **格式模板** —— 用 starship 风格模板重塑任意段：`{var}` 插值、`[text](style)` 局部样式、可选组。Nerd Font 图标和 emoji 直接往里贴。
- **Shell 命令 segment** —— 一条配置就把任意命令的 stdout 变成一个段。
- **可插拔 segment** —— 任何扩展一个函数调用即可注册自己的段；pi-info 保持纯展示层。
- **容器样式** —— 状态栏放 footer 或输入框上方/下方；加边框、背景、对齐、内外边距；放不下时可截断或换行。
- **文字效果** —— 彩虹、渐变、呼吸、波浪；静态或动态，凡是能写颜色的地方都能用。扩展可以注册自己的效果。
- **完全可配置** —— 在 pi 内开关、改色、排序、改格式，设置跨会话持久化。

<p align="center"><img src="assets/basic.png" alt="pi-info 状态栏效果" width="700" /></p>

## 快速开始

```bash
pi install npm:@sentixx/pi-info
```

pi 已在运行？先 `/reload`，再打开配置器：

```text
/info
```

## Segment 一览

| Segment | 显示内容 | 变量 | 默认格式 |
| --- | --- | --- | --- |
| `model` | 当前模型名 | `{name}` `{id}` | `{name}` |
| `thinking` | 思考等级，按等级着色 | `{level}` | `think:{level}` |
| `context` | 上下文用量，绿 → 黄 → 红 | `{percent}` `{window}` | `{percent}% / {window}` |
| `extensions` | 其他扩展设置的状态徽章 | `{key}` `{text}` | `{key}:{text}` |
| `billing` | 会话累计花费 | `{cost}` | `${cost}` |
| `cache` | 提示缓存命中率 | `{percent}` | `{percent}%` |
| `io` | 累计 token 输入输出 | `{input}` `{output}` `{total}` | `(↑{input}  )(↓{output})` |
| `cwd` | 工作目录 | `{dir}` | `{dir}` |
| `branch` | 当前 git 分支 | `{branch}` | `{branch}` |

没有内容可显示的段会自动隐藏。

## 配置

<p align="center"><img src="assets/config.png" alt="pi-info 配置器 TUI" width="700" /></p>

### `/info` 命令

| 子命令 | 作用 |
| --- | --- |
| `/info segments` | 每段：开关显示 + 归属哪条栏（`above` / `below` / `footer`） |
| `/info color` | 每段颜色——主题色名或 `#RRGGBB` |
| `/info order` | 调整段顺序 |
| `/info separator` | 自定义段之间的分隔符（字符 + 颜色） |
| `/info format` | 编辑每段的格式模板 |
| `/info style` | 容器样式——位置、边框、背景、对齐、溢出 |
| `/info preset` | 一键套用格式预设——格式 + 分隔符（`plain` / `minimal` / `bars` / `nerd` / `powerline` / `emoji`） |

**段可见性：**

<p align="center"><img src="assets/visibility.png" alt="段可见性开关" width="600" /></p>

**颜色配置：**

<p align="center"><img src="assets/color.png" alt="颜色配置" width="600" /></p>

### 配置文件

设置持久化到 `~/.pi/agent/pi-info.json`——每个 segment 一个配置对象：

```json
{
  "separator": { "char": "❯", "color": "dim" },
  "style": { "position": "aboveEditor", "border": "rounded", "padding": 1 },
  "segments": {
    "model":   { "format": " {name}", "color": "accent", "order": 1 },
    "context": { "format": "[{percent}%](auto bold) · {window}" },
    "io":      false,
    "weather": { "command": "curl -s 'wttr.in?format=%t'", "interval": 300 }
  }
}
```

每段可用的键（全部可选）：

| 键 | 含义 |
| --- | --- |
| `format` | 模板字符串；省略则用该段默认格式 |
| `color` | 未套样式文本的基础色——主题色名或 `#RRGGBB` |
| `bg` | 段背景色块——`#RRGGBB` 或主题背景名（powerline 风格） |
| `order` | 优先级，越小越靠前（默认 999） |
| `position` | 把该段钉在某条栏（`footer` / `aboveEditor` / `belowEditor`）；省略则跟随全局 `style.position` |
| `hidden` | 隐藏该段；`"name": false` 是简写 |
| `command` | shell 命令，stdout 即 `{output}` —— 定义一个自定义段 |
| `interval` | 命令输出缓存 N 秒（默认 60） |
| `label` | 命令段在 `/info` 里的显示名 |

### Powerline 外观

`/info preset` → `powerline` 把每个 segment 变成彩色块，块间用箭头无缝过渡（需要 patched 字体）。它本质是两个可以手动组合的配置：每段一个 `bg`，加上分隔符切到 powerline 模式：

```json
{
  "separator": { "char": "", "mode": "powerline" },
  "segments": {
    "model":   { "bg": "#8aadf4", "color": "#1e2030" },
    "context": { "bg": "#494d64" }
  }
}
```

powerline 模式下分隔符 `char` 的前景色取自左块的 `bg`、背景色取自右块的 `bg`——经典的无缝过渡效果。没有配 `bg` 的段按普通文本渲染。

### 容器样式

整条状态栏由可选的顶层 `style` 块控制——放在哪、被什么包裹、放不下时怎么办。全部省略时就是经典 footer 外观。

| 键 | 取值 | 含义 |
| --- | --- | --- |
| `position` | `footer`（默认）/ `aboveEditor` / `belowEditor` | 挂载位置；非 footer 位置会替代 pi 内置 footer |
| `align` | `left`（默认）/ `center` / `right` | 全宽时对齐内容；紧贴内容时对齐整条栏 |
| `width` | `full`（默认）/ `content` | 铺满终端，或紧贴内容宽度 |
| `overflow` | `truncate`（默认）/ `wrap` | 内容超宽：截断，或按 segment 边界换行 |
| `border` | `none`（默认）/ `single` / `rounded` / `double` / `heavy` / `ascii` / `top` | 边框；`top` 只在上方画一条线 |
| `borderColor` | 主题色名或 `#RRGGBB` | 边框颜色（默认 `dim`） |
| `background` | 主题背景名或 `#RRGGBB` | 背景色，如 `selectedBg` 或 `#303446` |
| `padding` | `0`–`8` | 内容与边框/背景边缘之间的空格数 |
| `marginTop` / `marginBottom` | `0`–`5` | 栏上下的空行数 |

`/info style` 内置一键预设：`plain`、`boxed`（圆角边框）、`island`（居中悬浮岛）、`top-line`、`above-input`、`below-input`。

```json
"style": { "align": "center", "width": "content", "border": "rounded", "padding": 1 }
```

```text
        ╭─────────────────────────────────────────╮
        │ claude-opus-4.7 ❯ think:med ❯ 2.6% / 1M │
        ╰─────────────────────────────────────────╯
```

**拆成多条栏：** 给任意段单独配 `position`（在 `/info segments` 里或直接写配置），状态栏即拆分——没配的段跟随全局 `style.position`。各栏共享容器样式，空栏自动消失。

```json
"segments": {
  "model":   { "position": "aboveEditor" },
  "context": { "position": "aboveEditor" }
}
```

```text
claude-opus-4.7  ❯  2.6% / 1.0M     ← 输入框上方
──────────────────────────────────
hello world█
──────────────────────────────────
$0.412  ❯  ↑12k ↓3.4k               ← footer（其余的段）
```

### 格式模板

```text
{var}            变量插值
[text](style)    局部样式——颜色（#RRGGBB / 主题色名）、"auto"、
                 以及 bold / italic / underline，空格分隔
(group)          可选组：组内所有 {var} 都为空时整组消失
\x               转义任意语法字符
```

`auto` 解析为该段的语义色——自定义格式后 context 仍保留阈值变色、
thinking 仍保留等级色。任何 Unicode 都能用：Nerd Font 字形、emoji、powerline 字符。

```json
"context": "[{percent}%](auto) [of](dim) {window}",
"branch":  "[](#f34f29) {branch}",
"io":      "(⬆{input}  )(⬇{output})"
```

### 文字效果

凡是接受颜色的地方——段的 `color`、`[text](style)` 局部样式、`borderColor`、分隔符颜色——都可以写效果名：

| 效果 | 外观 |
| --- | --- |
| `rainbow` | 色相沿文字展开的彩虹 |
| `rainbow-flow` | 随时间流动的彩虹 *（动态）* |
| `gradient:#a..#b[..#c…]` | 多停靠点渐变 |
| `gradient-flow:#a..#b[..…]` | 随时间流动的渐变 *（动态）* |
| `pulse:#RRGGBB` | 整段文字亮度呼吸 *（动态）* |
| `wave:#RRGGBB` | 亮度波浪滚过文字 *（动态）* |

```json
"model":   { "color": "rainbow-flow" },
"context": { "format": "[{percent}%](gradient:#a6e3a1..#f38ba8) / {window}" }
```

动态效果由重渲染定时器驱动，定时器只在画面上确实有动态效果时运行——静态配置零开销。效果和 segment 一样是开放注册表：任何扩展都能注册自己的效果（见下方"扩展"）。

### 环境变量

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `PI_INFO_SHOW` | 启动默认显示的段 | `model,context` |
| `PI_INFO_THRESHOLDS` | 上下文警告,危险百分比 | `70,90` |
| `PI_INFO_CONFIG` | 覆盖配置文件路径 | `/tmp/sl.json` |

## 扩展：自定义 segment

任何东西都可以成为一个 segment。零代码路径是配置里的 `command` 条目（见上）。需要完全控制时，在任何 pi 扩展或脚本里注册：

```ts
import { registerSegment } from "@sentixx/pi-info/extensions/statusline.js";

registerSegment({
	name: "review-queue",
	label: "Review Queue",
	// 暴露模板变量，用户就能自己改你这个段的格式：
	data(ctx) {
		const count = getQueueCountSomehow();
		return count > 0 ? { count: String(count) } : null; // null 即隐藏
	},
	defaultFormat: "{count} reviews",
	color: () => "#89b4fa",
});
```

只实现 `render()` 的段也能工作——其输出以 `{output}` 变量暴露给模板。注册的段自动出现在 `/info segments`、`color`、`order`、`format` 中，设置持久保存。扩展也可以通过 pi 的 `ctx.ui.setStatus()` 发布轻量的一次性徽章，显示在 `extensions` 段里。

文字效果走同样的开放注册模式：

```ts
import { registerEffect } from "@sentixx/pi-info/extensions/statusline.js";

registerEffect("flag", {
	// 返回第 i 个字符（共 n 个）在 t 秒时的十六进制颜色。
	colorAt: (i, n) => ["#ff0000", "#ffffff", "#00aa00"][Math.floor((i / n) * 3)],
	// intervalMs: 120,  // 动态效果设置帧间隔
});
// 用户即可写 "color": "flag" 或 [text](flag)
```

## 边界：pi-info 做什么、不做什么

pi-info 是一个**纯展示层**——信息的终端汇点（sink）。边界明确如下：

**只做：**

1. **状态栏外观** —— 容器、布局、颜色、动效：一切关于"怎么显示"的事。
2. **信息展示** —— 对收到的信息做只读呈现。
3. **只收不取** —— 数据通过三条单向通道进来：pi 自身的运行时状态（模型、上下文等）、`registerSegment` / `registerEffect` 注册 API、`command` 段（你自己脚本的 stdout）。

**坚决不做：**

1. **不生成信息** —— 不计算、不聚合、不推导新数据。显示的一切必须由数据源原样提供（`12000 → 12k` 这类纯展示格式化是唯一的变换）。
2. **不存储信息** —— 不记历史、不建数据缓存，除显示配置外不写盘（`command` 输出的秒级内存缓存属于渲染管道，不算存储）。
3. **不与其他插件高耦合** —— 唯一的接触面是单向注册 API。pi-info 不 import、不查询、不依赖任何其他扩展的内部；注册方消失，pi-info 照常工作。
4. **不输出信息** —— 它是管道的终点。不提供查询 API、不发事件、不写任何供他人读取的状态。

如果一个需求要 pi-info 生产、持久化或对外发布数据，正确做法是在你自己的扩展或脚本里完成，**把结果交给 pi-info 来显示**。

## 架构

```text
extensions/statusline.ts   入口：事件接线、/info 命令、footer 安装
lib/
  constants.ts             段名、标签、默认值
  config.ts                每段配置持久化 + 环境变量解析
  template.ts              格式模板引擎（{var}、[..](style)、可选组）
  colors.ts / text.ts      颜色与文本工具
  presets.ts               一键格式预设
  registry.ts              动态段注册表（registerSegment 公开 API）
  effects.ts               文字效果注册表（彩虹、渐变，registerEffect 公开 API）
  style.ts                 容器样式（位置、边框、背景）
  footer.ts                footer 单行渲染器
  status-filter.ts         扩展状态过滤
  configurators/           /info TUI 配置器
segments/                  SegmentProvider 接口 + 内置 provider
```

## 路线图

- **自定义渲染器** —— 配置指向你自己的 TS 模块，完全接管 footer 渲染，类似 Claude Code 的 statusline。

## 致谢与许可

MIT。源自对 Jenny Yu 的 [pi-bar](https://github.com/tianrendong/pi-bar)（MIT）的重写；见 [LICENSE](LICENSE)。
