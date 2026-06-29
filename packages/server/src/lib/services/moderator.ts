import type { RefContext } from '../types';
import { blocks } from '../prompts';
import { toLogUsage, type LogUsage } from './log';
import { getOpenAIClient } from '../clients/openai';
import { addFlag } from './flags';
import { block } from './user';

export type ModerationLevel = 'info' | 'warning' | 'danger';

export interface ModerateInput {
	feedId: string;
	userId: string;
	text: string;
	context: RefContext | null;
}

export interface ModerateResult {
	level: 'ok' | ModerationLevel;
	text?: string;
	flagId?: string;
	blocked?: boolean;
	usage: LogUsage[];
}

const MODERATOR_MODEL = 'gpt-5-nano';

const OK_CRITERIA = `
Use "ok" when the post is appropriate and on-topic for the page context.
`.trim();

const INFO_CRITERIA = `
Use "info" for posts that are harmless but not relevant to fishing or the page topic, such as unrelated general questions.
`.trim();

const WARNING_CRITERIA = `
Use "warning" for profanity, blatant marketing, spam, repetitive self-promotion, or low-effort commercial content.
Profanity is always "warning", never "info".
`.trim();

const DANGER_CRITERIA = `
Use "danger" for pornography, hate speech, harassment, threats, illegal activity, or other content that must be removed immediately.
`.trim();

const MODERATE_OUTPUT = `
When level is not "ok", write a brief internal note in "text" explaining the decision.
When level is "ok", leave "text" empty.
The input includes the post text and optional page context describing where it was posted.
Use page context to judge relevance for info-level flags.
`.trim();

const MODERATE_ROLE = `
You moderate user posts on a fishing community site.
Classify the post into exactly one level.
`.trim();

const MODERATE_INSTRUCTIONS = blocks(
	MODERATE_ROLE,
	OK_CRITERIA,
	INFO_CRITERIA,
	WARNING_CRITERIA,
	DANGER_CRITERIA,
	MODERATE_OUTPUT,
);

const moderateSchema = {
	type: 'object',
	properties: {
		level: {
			type: 'string',
			enum: ['ok', 'info', 'warning', 'danger'],
		},
		text: { type: 'string' },
	},
	required: ['level', 'text'],
	additionalProperties: false,
} as const;

async function classifyPost(
	input: ModerateInput,
): Promise<{ level: ModerateResult['level']; text: string; usage: LogUsage[] }> {
	const openai = getOpenAIClient();

	const response = await openai.responses.create({
		model: MODERATOR_MODEL,
		instructions: MODERATE_INSTRUCTIONS,
		input: JSON.stringify({
			text: input.text,
			context: input.context,
		}),
		text: {
			format: {
				type: 'json_schema',
				name: 'moderation',
				strict: true,
				schema: moderateSchema,
			},
		},
	});

	const result = JSON.parse(response.output_text) as {
		level: ModerateResult['level'];
		text: string;
	};
	const usage = toLogUsage(response.usage, MODERATOR_MODEL);

	return {
		...result,
		usage: usage ? [usage] : [],
	};
}

export async function moderate(input: ModerateInput): Promise<ModerateResult> {
	const { feedId, userId } = input;
	const { level, text, usage } = await classifyPost(input);

	if (level === 'ok') {
		return { level, usage };
	}

	const flagId = await addFlag({
		feedId,
		userId,
		level,
		text: text.trim(),
	});

	let blocked = false;
	if (level === 'danger') {
		await block(userId);
		blocked = true;
	}

	return {
		level,
		text: text.trim() || undefined,
		flagId,
		blocked: blocked || undefined,
		usage,
	};
}
