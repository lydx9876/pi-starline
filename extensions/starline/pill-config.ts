/**
 * Configuration for the pill footer style.
 *
 * The pill bar is a second rendering of the footer, not a second footer: it
 * draws the same segments as coloured blocks joined by seamless arrows instead
 * of as coloured text. `footerStyle: "text"` keeps `footerFormat` and upstream
 * behaviour exactly; `footerStyle: "pill"` ignores `footerFormat` and lays the
 * bar out from `pill.segments`.
 */

export type FooterStyle = "text" | "pill";

/** Glyph drawn between two pills. */
export type PillSeparator = "powerline" | "powerline-thin" | "none";

/** How the two ends of the bar are closed off. */
export type PillCaps = "round" | "right" | "none";

export type PillConfig = {
	/**
	 * Ordered segments, left to right. Names are `footerSegments` keys, plus
	 * `extensionStatus` for every status not already listed and
	 * `extensionStatus:<key>` to place one specific status.
	 */
	segments: string[];
	separator: PillSeparator;
	bold: boolean;
	caps: PillCaps;
	/** Unfold a pill's bubble upward from the pill instead of showing it at once. */
	bubbleAnimation: boolean;
	/**
	 * Segment name that starts the bar's second row: that segment and everything
	 * after it move down, the rest stays on the first row. `null` keeps one row.
	 */
	rowBreak: string | null;
	/**
	 * Wrap instead of dropping: a row that runs out of width continues on the next
	 * line, up to `maxLines` lines. `false` keeps the old behaviour, where the pills
	 * that do not fit collapse into the `+N` counter.
	 */
	wrap: boolean;
	/** Lines one row may wrap onto, counter and all; the last line keeps the `+N`. */
	maxLines: number;
};

export const EXTENSION_STATUS_SEGMENT = "extensionStatus";
export const EXTENSION_STATUS_PREFIX = `${EXTENSION_STATUS_SEGMENT}:`;

/** Segment names that map onto a footer variable. */
export const PILL_SEGMENT_VARIABLES: Record<string, string> = {
	model: "model",
	thinking: "thinking",
	previousPrompt: "previous_prompt",
	latest: "latest",
	queue: "queue",
	subagents: "subagents",
	cwd: "cwd",
	sessionName: "session_name",
	git: "git",
	gitCommit: "git_commit",
	gitTag: "git_tag",
	gitMetrics: "git_metrics",
	gitPr: "git_pr",
	runtime: "runtime",
	context: "context",
	tps: "tps",
	cost: "cost",
	sessionDuration: "session_duration",
	username: "username",
	time: "time",
	os: "os",
	packageVersion: "package_version",
};

export const DEFAULT_PILL_CONFIG: PillConfig = {
	segments: [
		"model",
		"thinking",
		"previousPrompt",
		"latest",
		"queue",
		"subagents",
		"cwd",
		"git",
		"context",
		"tps",
		"cost",
		EXTENSION_STATUS_SEGMENT,
	],
	separator: "powerline",
	bold: true,
	caps: "round",
	bubbleAnimation: true,
	rowBreak: null,
	wrap: false,
	maxLines: 3,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFooterStyle(value: unknown): FooterStyle {
	return value === "pill" ? "pill" : "text";
}

function parseSeparator(value: unknown): PillSeparator {
	return value === "powerline-thin" || value === "none" || value === "powerline"
		? value
		: DEFAULT_PILL_CONFIG.separator;
}

function parseCaps(value: unknown): PillCaps {
	return value === "right" || value === "none" || value === "round"
		? value
		: DEFAULT_PILL_CONFIG.caps;
}

/** A row break is a segment name that is actually on the bar; anything else is no break. */
function parseRowBreak(value: unknown): string | null {
	return typeof value === "string" && isKnownPillSegment(value) ? value : null;
}

/** One line is the floor, and a wrap budget past a few lines would eat the screen. */
function parseMaxLines(value: unknown): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return DEFAULT_PILL_CONFIG.maxLines;
	return Math.min(value, 8);
}

/** A segment name is usable if it maps to a variable or addresses a status. */
export function isKnownPillSegment(name: string): boolean {
	if (name === EXTENSION_STATUS_SEGMENT) return true;
	if (name.startsWith(EXTENSION_STATUS_PREFIX)) return name.length > EXTENSION_STATUS_PREFIX.length;
	return name in PILL_SEGMENT_VARIABLES;
}

/**
 * Every segment name `/starline` can put on the bar, in a fixed order so the
 * rows do not move under the cursor when a position changes. Per-status
 * `extensionStatus:<key>` entries are not listed here: they depend on what other
 * extensions published this session, and the *Pills* tab appends a row for each
 * one after these.
 */
export const PILL_SEGMENT_NAMES: readonly string[] = [
	...Object.keys(PILL_SEGMENT_VARIABLES),
	EXTENSION_STATUS_SEGMENT,
];

/** 1-based position of a segment in the bar, or 0 when it is not drawn. */
export function pillSegmentPosition(segments: readonly string[], name: string): number {
	return segments.indexOf(name) + 1;
}

/**
 * Apply a position edit to `pill.segments`.
 *
 * `value` is `off` or a 1-based position. A position is where the segment ends
 * up: everything already there shifts along, and a position past the end
 * appends. Moving the segment that is already in the bar works the same way,
 * because it is removed before the index is applied.
 */
export function movePillSegment(
	segments: readonly string[],
	name: string,
	value: string,
): string[] {
	const rest = segments.filter((segment) => segment !== name);
	if (value === "off") return rest;
	const position = Number(value);
	if (!Number.isInteger(position) || position < 1) return [...segments];
	const index = Math.min(position - 1, rest.length);
	return [...rest.slice(0, index), name, ...rest.slice(index)];
}

/** Segment names that became part of another one. */
const LEGACY_SEGMENT_NAMES: Record<string, string> = {
	gitBranch: "git",
	gitStatus: "git",
	gitState: "git",
	tokens: "context",
	cacheHit: "context",
};

function parseSegments(value: unknown): string[] {
	if (!Array.isArray(value)) return DEFAULT_PILL_CONFIG.segments;
	const segments: string[] = [];
	for (const entry of value) {
		if (typeof entry !== "string") continue;
		// A bar that listed the branch and the dirty block separately now draws
		// both in one pill, so the old names collapse into it instead of vanishing.
		const renamed = LEGACY_SEGMENT_NAMES[entry.trim()] ?? entry.trim();
		// Unknown names are dropped rather than rendered as empty pills, so a
		// typo shortens the bar instead of punching a hole in it.
		if (renamed && isKnownPillSegment(renamed) && !segments.includes(renamed))
			segments.push(renamed);
	}
	return segments;
}

export function normalizePillConfig(value: unknown): PillConfig {
	if (!isRecord(value)) return { ...DEFAULT_PILL_CONFIG };
	return {
		segments: parseSegments(value.segments),
		separator: parseSeparator(value.separator),
		bold: typeof value.bold === "boolean" ? value.bold : DEFAULT_PILL_CONFIG.bold,
		caps: parseCaps(value.caps),
		bubbleAnimation:
			typeof value.bubbleAnimation === "boolean"
				? value.bubbleAnimation
				: DEFAULT_PILL_CONFIG.bubbleAnimation,
		rowBreak: parseRowBreak(value.rowBreak),
		wrap: typeof value.wrap === "boolean" ? value.wrap : DEFAULT_PILL_CONFIG.wrap,
		maxLines: parseMaxLines(value.maxLines),
	};
}
