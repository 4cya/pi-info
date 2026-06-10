/**
 * Plain-text helpers shared across segments and the footer renderer.
 */

/** 12345 -> "12.3k", 1_234_567 -> "1.2M". */
export function formatTokens(n: number): string {
	if (n >= 1_000_000) {
		const value = n / 1_000_000;
		return value >= 10 ? `${Math.round(value)}M` : `${value.toFixed(1)}M`;
	}
	if (n >= 1_000) {
		const value = n / 1_000;
		return value >= 10 ? `${Math.round(value)}k` : `${value.toFixed(1)}k`;
	}
	return `${n}`;
}

/** Strips provider prefix and trailing date suffix from a model id. */
export function formatModelName(id: string | undefined): string {
	if (!id) return "no-model";
	const base = id.includes("/") ? (id.split("/").pop() ?? id) : id;
	return base.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

// ── Terminal-control stripping ────────────────────────────────────────────
// Extension status text is set by other extensions and renders into the
// terminal; we defensively remove ANSI/CSI/OSC/DCS/SOS/PM/APC escape
// sequences so a misbehaving extension cannot corrupt the footer.

const ESC_BYTE = 0x1b;
const BEL_BYTE = 0x07;
const ST_BYTE = 0x9c;

function isControlCharacter(code: number): boolean {
	return (code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f);
}

function isWhitespaceControl(code: number): boolean {
	return (
		code === 0x09 ||
		code === 0x0a ||
		code === 0x0b ||
		code === 0x0c ||
		code === 0x0d
	);
}

function skipCsiSequence(text: string, startIndex: number): number {
	for (let index = startIndex; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code >= 0x40 && code <= 0x7e) return index + 1;
	}
	return text.length;
}

function skipStringControl(text: string, startIndex: number): number {
	for (let index = startIndex; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code === BEL_BYTE || code === ST_BYTE) return index + 1;
		if (code === ESC_BYTE && text.charCodeAt(index + 1) === 0x5c) {
			return index + 2;
		}
	}
	return text.length;
}

function skipEscapeSequence(text: string, escapeIndex: number): number {
	const nextCode = text.charCodeAt(escapeIndex + 1);
	if (Number.isNaN(nextCode)) return escapeIndex + 1;

	switch (nextCode) {
		case 0x5b: // CSI: ESC [
			return skipCsiSequence(text, escapeIndex + 2);
		case 0x5d: // OSC: ESC ]
		case 0x50: // DCS: ESC P
		case 0x58: // SOS: ESC X
		case 0x5e: // PM: ESC ^
		case 0x5f: // APC: ESC _
			return skipStringControl(text, escapeIndex + 2);
		default:
			if (
				nextCode === 0x20 ||
				nextCode === 0x23 ||
				nextCode === 0x25 ||
				(nextCode >= 0x28 && nextCode <= 0x2f)
			) {
				return Math.min(text.length, escapeIndex + 3);
			}
			return Math.min(text.length, escapeIndex + 2);
	}
}

/** Removes terminal escape sequences and collapses control chars to spaces. */
export function stripTerminalControls(text: string): string {
	let stripped = "";
	for (let index = 0; index < text.length; ) {
		const code = text.charCodeAt(index);

		if (code === ESC_BYTE) {
			index = skipEscapeSequence(text, index);
			continue;
		}
		if (code === 0x9b) {
			index = skipCsiSequence(text, index + 1);
			continue;
		}
		if (
			code === 0x90 ||
			code === 0x98 ||
			code === 0x9d ||
			code === 0x9e ||
			code === 0x9f
		) {
			index = skipStringControl(text, index + 1);
			continue;
		}
		if (isControlCharacter(code)) {
			if (isWhitespaceControl(code)) stripped += " ";
			index++;
			continue;
		}

		stripped += text[index];
		index++;
	}
	return stripped.replace(/\s+/gu, " ").trim();
}
