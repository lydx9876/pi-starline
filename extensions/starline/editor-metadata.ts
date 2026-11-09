/**
 * The text Starline can paint on the editor's top border.
 *
 * Since 0.9 the model name lives in the pill, and the border carried only
 * working status. `editorMetadataFormat` brings a label back for people who want
 * the run's context where their eye already is — the border is idle whenever Pi
 * draws its own working row (`features.embedWorkingStatus: false`), and a
 * transient working/retry status still wins that slot when one exists.
 *
 * Variables are the pill's own vocabulary, so a template reads the same way:
 * `$model`, `$name`, `$provider`, `$thinking`, `$cwd`, `$branch`.
 */

/** What a template may interpolate. Missing values collapse out of the line. */
export type EditorMetadataValues = {
	/** The model id, or its display name when `editorModelLabel` is `name`. */
	model: string;
	/** The model's display name, always (empty when the model has none). */
	name: string;
	/** The provider, as the pill spells it. */
	provider: string;
	/** The current thinking level, empty when it is `off`. */
	thinking: string;
	/** The working directory as the pill abbreviates it. */
	cwd: string;
	/** The current branch, empty outside a git repository. */
	branch: string;
};

type Variable = keyof EditorMetadataValues;

const VARIABLES: readonly Variable[] = ["model", "name", "provider", "thinking", "cwd", "branch"];

/**
 * Interpolate `template`, then tidy what empty values leave behind: `()` around a
 * missing thinking level, a dangling `·` separator, doubled spaces. A template
 * whose variables are all empty renders as "", so the border stays a plain rule
 * rather than an empty label.
 */
export function renderEditorMetadata(
	template: string,
	values: EditorMetadataValues,
): string {
	let out = template;
	for (const variable of VARIABLES) {
		// Longest first would matter if a name were a prefix of another; none are,
		// but the boundary keeps `$model` from eating a literal `$models`.
		out = out.replace(new RegExp(`\\$${variable}(?![A-Za-z0-9_])`, "g"), values[variable]);
	}
	out = out
		// `云端反代()` when the run has no thinking level, or `()` on its own.
		.replace(/\(\s*\)/g, "")
		// A separator with nothing on one side of it.
		.replace(/·\s*·/g, "·")
		.replace(/^\s*·\s*|\s*·\s*$/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return out;
}