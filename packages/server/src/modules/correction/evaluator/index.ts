import type { FeedEntry } from '@bwfish/core';
import { getOpenAIClient } from '../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../lib/services/log';
import type { AgentRunPayload, ContributorContext, RefContext } from '../types';
import { updateFeedScore } from '../feed';
import { logStep } from '../log';
import { EVALUATE_INSTRUCTIONS, EVALUATOR_MODEL } from './prompts';

export const id = 'bwfish-evaluator';

export interface EvaluatorRunResult {
	score: number;
	text: string;
	usage: LogUsage[];
}

const evaluateSchema = {
	type: 'object',
	properties: {
		score: { type: 'integer', minimum: 0, maximum: 100 },
		text: { type: 'string' },
	},
	required: ['score', 'text'],
	additionalProperties: false,
} as const;

function buildEvaluationInput(payload: AgentRunPayload): Record<string, unknown> {
	const originalBody =
		typeof payload.context?.page?.body === 'string' ? payload.context.page.body : null;
	const proposedBody =
		payload.correction?.text ??
		(typeof payload.payload === 'object' &&
		payload.payload !== null &&
		'text' in payload.payload &&
		typeof (payload.payload as { text?: unknown }).text === 'string'
			? (payload.payload as { text: string }).text
			: null);

	return {
		type: 'correction',
		text: payload.message,
		context: payload.context,
		originalBody,
		proposedBody,
	};
}

export async function evaluate(payload: AgentRunPayload): Promise<EvaluatorRunResult> {
	const openai = getOpenAIClient();

	const response = await openai.responses.create({
		model: EVALUATOR_MODEL,
		instructions: EVALUATE_INSTRUCTIONS,
		input: JSON.stringify(buildEvaluationInput(payload)),
		text: {
			format: {
				type: 'json_schema',
				name: 'feed_evaluation',
				strict: true,
				schema: evaluateSchema,
			},
		},
	});

	const result = JSON.parse(response.output_text) as { score: number; text: string };
	const usage = toLogUsage(response.usage, EVALUATOR_MODEL);
	const score = Math.min(100, Math.max(0, Math.round(result.score)));

	return {
		score,
		text: result.text.trim(),
		usage: usage ? [usage] : [],
	};
}

export async function evaluateEntry(
	entry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
	correction: { text: string },
): Promise<FeedEntry> {
	const feedId = entry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for evaluation');
	}

	const evaluation = await evaluate({
		message: entry.text,
		context,
		contributor,
		entryType: entry.type,
		payload: entry.payload,
		correction,
		feedId,
		userId: entry.createdBy,
	});

	await logStep(
		entry,
		`Score ${evaluation.score}/100 — ${evaluation.text}`,
		evaluation.usage,
		['evaluator', id],
	);
	await updateFeedScore(feedId, evaluation.score);

	return { ...entry, score: evaluation.score };
}
