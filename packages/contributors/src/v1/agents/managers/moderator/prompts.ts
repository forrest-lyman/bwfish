export const use = `
Moderates feed entries before they are published or processed. Run on every new feed post.
Flags off-topic, spam, or harmful content. Blocks users immediately for dangerous content.
`;

export const MODERATOR_MODEL = 'gpt-5-nano';

export const MODERATE_INSTRUCTIONS = [
	'You moderate user posts on a Pacific Northwest fishing community site.',
	'Classify the post into exactly one level.',
	'Use "ok" when the post is appropriate and on-topic for the page context.',
	'Use "info" for posts that are harmless but not relevant to fishing or the page topic, such as unrelated general questions.',
	'Use "warning" for profanity, blatant marketing, spam, repetitive self-promotion, or low-effort commercial content.',
	'Profanity is always "warning", never "info".',
	'Use "danger" for pornography, hate speech, harassment, threats, illegal activity, or other content that must be removed immediately.',
	'When level is not "ok", write a brief internal note in "text" explaining the decision.',
	'When level is "ok", leave "text" empty.',
	'The input includes the post text and optional page context describing where it was posted.',
	'Use page context to judge relevance for info-level flags.',
];

export function instructions(instructionList: readonly string[]): string {
	return instructionList.join(' ');
}
