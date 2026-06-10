/**
 * Extension-status filtering: which `ctx.ui.setStatus()` keys appear in the
 * extensions segment. "all" mode hides an explicit set; "only" mode shows an
 * explicit set (new keys default hidden).
 */

export type StatusFilter =
	| { mode: "all"; hidden: Set<string> }
	| { mode: "only"; shown: Set<string> };

export type SerializedStatusFilter =
	| { mode: "all"; hidden: string[] }
	| { mode: "only"; shown: string[] };

export function shouldShowStatus(key: string, filter: StatusFilter): boolean {
	if (filter.mode === "only") return filter.shown.has(key);
	return !filter.hidden.has(key);
}

export function serializeStatusFilter(filter: StatusFilter): SerializedStatusFilter {
	if (filter.mode === "only") {
		return { mode: "only", shown: Array.from(filter.shown).sort() };
	}
	return { mode: "all", hidden: Array.from(filter.hidden).sort() };
}

export function parseSerializedStatusFilter(value: unknown): StatusFilter | null {
	if (!value || typeof value !== "object") return null;
	const data = value as Partial<SerializedStatusFilter>;

	if (data.mode === "only" && Array.isArray(data.shown)) {
		return { mode: "only", shown: new Set(data.shown) };
	}
	if (data.mode === "all" && Array.isArray(data.hidden)) {
		return { mode: "all", hidden: new Set(data.hidden) };
	}
	return null;
}

export function describeStatusFilter(filter: StatusFilter): string {
	if (filter.mode === "only") {
		const shown = Array.from(filter.shown).sort();
		return shown.length > 0 ? `showing only: ${shown.join(", ")}` : "showing none";
	}

	const hidden = Array.from(filter.hidden).sort();
	return hidden.length > 0 ? `showing all except: ${hidden.join(", ")}` : "showing all";
}

/** Union of keys seen this session and keys referenced by the filter. */
export function getKnownStatusKeys(filter: StatusFilter, seenStatusKeys: Set<string>): string[] {
	const keys = new Set(seenStatusKeys);
	if (filter.mode === "only") {
		for (const key of filter.shown) keys.add(key);
	} else {
		for (const key of filter.hidden) keys.add(key);
	}
	return Array.from(keys).sort();
}

export function splitStatusKeys(raw: string): string[] {
	return raw
		.split(/[\s,]+/)
		.map((key) => key.trim())
		.filter(Boolean);
}
