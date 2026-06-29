export const use = `
Reviews user-submitted page corrections and publishes approved changes. Run on correction feed entries.
Compares the original page body, the proposed markdown, and the contributor's explanation before publishing.
`;

export const PUBLISHER_MODEL = 'gpt-5-mini';
export const REPLY_MODEL = 'gpt-5-nano';
export const REPLY_MAX_LENGTH = 500;

export const REVIEW_INSTRUCTIONS = [
	'You review user-submitted corrections to fishing content pages on bwfish.com.',
	'Each submission includes three inputs: the original page body, the proposed replacement body, and the contributor explanation of what they changed.',
	'Compare the original and proposed bodies to understand the actual edits.',
	'Check whether the contributor explanation accurately describes those edits.',
	'Use "publish" when the correction is accurate, improves the page, and the explanation matches the changes.',
	'Use "reject" when the correction is wrong, harmful, off-topic, removes useful content without reason, or the explanation clearly misrepresents the edits.',
	'Use "review" when the change is plausible but you are uncertain, the explanation is vague, or the edit needs human judgment.',
	'Write a brief "summary" of what actually changed between original and proposed.',
	'Set "explanationMatches" to true only when the contributor explanation reasonably describes the substantive edits.',
	'When decision is not "publish", write a brief internal note in "text" explaining why.',
	'When decision is "publish", leave "text" empty.',
];

export const REPLY_INSTRUCTIONS = [
	'You write short public replies confirming that a user correction was approved and published on bwfish.com.',
	'Thank the contributor briefly and acknowledge what changed using the provided summary.',
	'Keep the tone friendly and concise — one to three sentences, plain text only.',
	'Do not mention internal review steps, AI, or moderation.',
];

export const REVIEW_REPLY_INSTRUCTIONS = [
	'You write short public replies letting a contributor know their page correction is being reviewed on bwfish.com.',
	'Thank them for the submission and confirm we are reviewing their proposed changes.',
	'Keep the tone friendly and concise — one to three sentences, plain text only.',
	'Do not mention scores, internal review steps, AI, or moderation.',
	'Do not say the changes were published.',
];

export function instructions(instructionList: readonly string[]): string {
	return instructionList.join(' ');
}
