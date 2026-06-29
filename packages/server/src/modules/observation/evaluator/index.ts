import type { FeedEntry } from '@bwfish/core';
import { getOpenAIClient } from '../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../lib/services/log';
import type { ContributorContext } from '../contributor';
import type { RefContext } from '../../lib/types';
import { updateFeedScore } from '../feed';
import { logStep } from '../log';
import { EVALUATE_INSTRUCTIONS, EVALUATOR_MODEL } from './prompts';

export const id = 'bwfish-evaluator';

interface EvaluatePayload {
	message: string;
	context: RefContext;
	contributor: ContributorContext;
	feedId: string;
	userId: string;
}

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

export async function evaluate(payload: EvaluatePayload): Promise<EvaluatorRunResult> {
	const openai = getOpenAIClient();

	const response = await openai.responses.create({
		model: EVALUATOR_MODEL,
		instructions: EVALUATE_INSTRUCTIONS,
		input: JSON.stringify({
			type: 'observation',
			text: payload.message,
			context: payload.context,
		}),
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
): Promise<void> {
	const feedId = entry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for evaluation');
	}

	const evaluation = await evaluate({
		message: entry.text,
		context,
		contributor,
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
}
