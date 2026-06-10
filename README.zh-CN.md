# pi-info

[English](README.md) | [简体中文](README.zh-CN.md)

<img src="assets/cover.png" alt="pi-info cover" width="800" />

[pi](https://pi.dev) 的模块化、完全可配置信息栏。把你需要随时盯着的信息——当前模型、思考等级、上下文压力、花费、扩展状态——收进一行干净的 footer。

```text
claude-opus-4.7  ❯  think:med  ❯  2.6% / 1.0M  ❯  $0.412  ❯  ↑12k ↓3.4k  ❯  ~/projects/app
```

## 特性

- **模型可见** —— 不再因为手滑把贵的模型用在小事上，当前模型始终在眼前。
- **思考等级** —— 推理档位设错时立刻发现。
- **上下文压力** —— 用量随接近窗口上限由绿转黄再转红。
- **花费追踪** —— 可选的成本、缓存命中、token 输入输出段。
- **可插拔 segment** —— 任何扩展一个函数调用即可注册自己的段；pi-info 保持纯展示层。
- **完全可配置** —— 在 pi 内开关、改色、排序每个段，设置跨会话持久化。

<img src="assets/basic.png" alt="pi-info 状态栏效果" width="700" />

## 快速开始

```bash
pi install npm:@sentixx/pi-info
```

pi 已在运行？先 `/reload`，再打开配置器：

```text
/info
```

## Segment 一览

| Segment | 显示内容 | 默认 |
| --- | --- | --- |
| `model` | 当前模型名 | 开 |
| `thinking` | `think:<level>`，按等级着色 | 开 |
| `context` | 上下文用量百分比和窗口大小 | 开 |
| `extensions` | 其他扩展设置的状态徽章 | 开 |
| `billing` | 会话累计花费（`$0.412`） | 开 |
| `cache` | 提示缓存读/写 token（`R12k W3.4k`） | 开 |
| `io` | token 输入输出（`↑12k ↓3.4k`） | 开 |
| `cwd` | 工作目录（`~/projects/app`） | 开 |

没有内容可显示的段会自动隐藏。

## 配置

<img src="assets/config.png" alt="pi-info 配置器 TUI" width="700" />

### `/info` 命令

| 子命令 | 作用 |
| --- | --- |
| `/info segments` | 开关任意段，含扩展状态 |
| `/info status` | 按 key 精细过滤扩展状态 |
| `/info color` | 每段颜色——主题色名或 `#RRGGBB` |
| `/info order` | 调整段顺序 |
| `/info list` | 打印当前配置 |

**段可见性：**

<img src="assets/visibility.png" alt="段可见性开关" width="600" />

**颜色配置：**

<img src="assets/color.png" alt="颜色配置" width="600" />

设置持久化到 `~/.pi/agent/pi-info.json`，对所有会话生效。

### 环境变量

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `PI_INFO_SHOW` | 启动默认显示的段 | `model,context` |
| `PI_INFO_THRESHOLDS` | 上下文警告,危险百分比 | `70,90` |
| `PI_INFO_CONFIG` | 覆盖配置文件路径 | `/tmp/sl.json` |

## 扩展：自定义 segment

pi-info 是纯展示层：它负责渲染，任何东西都可以成为一个 segment。在任何 pi 扩展或脚本里注册：

```ts
import { registerSegment } from "@sentixx/pi-info/extensions/statusline.js";

registerSegment({
	name: "git-branch",
	label: "Git Branch",
	render(ctx) {
		return getBranchSomehow(ctx.cwd); // 返回 null 即隐藏
	},
	color: () => "#89b4fa",
});
```

注册的段自动出现在 `/info segments`、`color`、`order` 中，可见性持久保存。扩展也可以通过 pi 的 `ctx.ui.setStatus()` 发布轻量的一次性徽章，显示在 `extensions` 段里。

## 架构

```text
extensions/statusline.ts   入口：事件接线、/info 命令、footer 安装
lib/
  constants.ts             段名、标签、默认值
  config.ts                配置持久化 + 环境变量解析
  colors.ts / text.ts      颜色与文本工具
  registry.ts              动态段注册表（registerSegment 公开 API）
  footer.ts                footer 单行渲染器
  status-filter.ts         扩展状态过滤
  configurators/           /info TUI 配置器
segments/                  SegmentProvider 接口 + 内置 provider
```

## 路线图

- **样式层** —— 在配置里声明式定义每段的分隔符/前后缀/宽度。
- **格式模板** —— `"{model} | {context} | {billing}"` 风格的布局字符串。
- **自定义渲染器** —— 配置指向你自己的 TS 模块，完全接管 footer 渲染，类似 Claude Code 的 statusline。

## 致谢与许可

MIT。源自对 Jenny Yu 的 [pi-bar](https://github.com/tianrendong/pi-bar)（MIT）的重写；见 [LICENSE](LICENSE)。
