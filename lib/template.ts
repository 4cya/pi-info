/**
 * Mini template engine for segment formats (starship-inspired).
 *
 * Syntax:
 *   {var}            variable interpolation; unknown vars render as ""
 *   [text](style)    style a span — space-separated tokens: a color
 *                    (#RRGGBB or theme name), "auto" (the segment's
 *                    semantic color), and bold / italic / underline
 *   (group)          optional group: skipped entirely when every {var}
 *                    inside is empty; groups without vars render literally
 *   \x               escape any syntax character
 *
 * Example: "[{percent}%](auto bold) (of [{window}](dim))"
 */

export type TemplateNode =
	| { kind: "text"; value: string }
	| { kind: "var"; name: string }
	| { kind: "styled"; children: TemplateNode[]; style: string }
	| { kind: "group"; children: TemplateNode[] };

/** A rendered span: style is the raw style string, or null for segment default. */
export type StyledRun = { text: string; style: string | null };

/** Parses a format string. Throws Error with a message on syntax errors. */
export function parseTemplate(format: string): TemplateNode[] {
	const { nodes, pos } = parseNodes(format, 0, "");
	if (pos !== format.length) {
		throw new Error(`Unexpected "${format[pos]}" at position ${pos}`);
	}
	return nodes;
}

function parseNodes(
	src: string,
	start: number,
	terminators: string,
): { nodes: TemplateNode[]; pos: number } {
	const nodes: TemplateNode[] = [];
	let text = "";
	let pos = start;
	const flush = () => {
		if (text) {
			nodes.push({ kind: "text", value: text });
			text = "";
		}
	};

	while (pos < src.length) {
		const ch = src[pos];
		if (ch === "\\" && pos + 1 < src.length) {
			text += src[pos + 1];
			pos += 2;
			continue;
		}
		if (terminators.includes(ch)) break;

		if (ch === "{") {
			const end = src.indexOf("}", pos);
			if (end === -1) throw new Error(`Unclosed "{" at position ${pos}`);
			flush();
			nodes.push({ kind: "var", name: src.slice(pos + 1, end).trim() });
			pos = end + 1;
			continue;
		}
		if (ch === "[") {
			flush();
			const inner = parseNodes(src, pos + 1, "]");
			if (src[inner.pos] !== "]") throw new Error(`Unclosed "[" at position ${pos}`);
			let after = inner.pos + 1;
			if (src[after] !== "(") {
				throw new Error(`Expected "(style)" after "]" at position ${after}`);
			}
			const styleEnd = src.indexOf(")", after);
			if (styleEnd === -1) throw new Error(`Unclosed style "(" at position ${after}`);
			nodes.push({
				kind: "styled",
				children: inner.nodes,
				style: src.slice(after + 1, styleEnd).trim(),
			});
			pos = styleEnd + 1;
			continue;
		}
		if (ch === "(") {
			flush();
			const inner = parseNodes(src, pos + 1, ")");
			if (src[inner.pos] !== ")") throw new Error(`Unclosed "(" at position ${pos}`);
			nodes.push({ kind: "group", children: inner.nodes });
			pos = inner.pos + 1;
			continue;
		}

		text += ch;
		pos++;
	}

	flush();
	return { nodes, pos };
}

function collectVars(nodes: TemplateNode[], out: string[]): void {
	for (const node of nodes) {
		if (node.kind === "var") out.push(node.name);
		else if (node.kind === "styled" || node.kind === "group") {
			collectVars(node.children, out);
		}
	}
}

function evalNodes(
	nodes: TemplateNode[],
	vars: Record<string, string>,
	style: string | null,
): StyledRun[] {
	const runs: StyledRun[] = [];
	for (const node of nodes) {
		switch (node.kind) {
			case "text":
				runs.push({ text: node.value, style });
				break;
			case "var":
				runs.push({ text: vars[node.name] ?? "", style });
				break;
			case "styled":
				runs.push(...evalNodes(node.children, vars, node.style));
				break;
			case "group": {
				const names: string[] = [];
				collectVars(node.children, names);
				const skip =
					names.length > 0 &&
					names.every((name) => !(vars[name] ?? "").trim());
				if (!skip) runs.push(...evalNodes(node.children, vars, style));
				break;
			}
		}
	}
	return runs;
}

/** Parses and evaluates a format string. Throws on syntax errors. */
export function renderTemplate(
	format: string,
	vars: Record<string, string>,
): StyledRun[] {
	return evalNodes(parseTemplate(format), vars, null);
}

/** Plain (uncolored) text of a run list. */
export function runsText(runs: StyledRun[]): string {
	return runs.map((run) => run.text).join("");
}

/** Trims leading/trailing whitespace across run boundaries. */
export function trimRuns(runs: StyledRun[]): StyledRun[] {
	const out = runs.map((run) => ({ ...run }));
	let i = 0;
	while (i < out.length) {
		out[i].text = out[i].text.replace(/^\s+/, "");
		if (out[i].text) break;
		i++;
	}
	let j = out.length - 1;
	while (j >= 0) {
		out[j].text = out[j].text.replace(/\s+$/, "");
		if (out[j].text) break;
		j--;
	}
	return out.filter((run) => run.text);
}
