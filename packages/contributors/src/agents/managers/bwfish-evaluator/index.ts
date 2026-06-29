import chalk from 'chalk';
import ora from 'ora';
import type { FeedEntryType } from '@bwfish/core';
import { getOpenAIClient } from '../../../clients/openai';
import type { AgentRunPayload } from '../../types';
import { toLogUsage, type LogUsage } from '../../../services/log';
import { EVALUATE_INSTRUCTIONS, EVALUATOR_MODEL, instructions, use } from './prompts';

export { use } from './prompts';

export const id = 'bwfish-evaluator';
export const title = 'BWFish Evaluator';

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

function requireEntryType(payload: AgentRunPayload): FeedEntryType {
	const entryType = payload.entryType ?? payload.contributor?.entry.type;
	if (!entryType || entryType === 'answer') {
		throw new Error('Evaluator requires a question, tip, or correction entry type');
	}

	return entryType;
}

function buildEvaluationInput(payload: AgentRunPayload, entryType: FeedEntryType): Record<string, unknown> {
	const input: Record<string, unknown> = {
		type: entryType,
		text: payload.message,
		context: payload.context,
	};

	if (entryType === 'correction') {
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

		input.originalBody = originalBody;
		input.proposedBody = proposedBody;
	}

	return input;
}

export async function run(payload: AgentRunPayload): Promise<EvaluatorRunResult> {
	const entryType = requireEntryType(payload);
	const spinner = ora(`Evaluating ${entryType}`).start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: EVALUATOR_MODEL,
			instructions: instructions(EVALUATE_INSTRUCTIONS),
			input: JSON.stringify(buildEvaluationInput(payload, entryType)),
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

		spinner.succeed(`Scored ${score}/100`);
		console.log(chalk.cyan(result.text.trim()));

		return {
			score,
			text: result.text.trim(),
			usage: usage ? [usage] : [],
		};
	} catch (error) {
		spinner.fail('Evaluation failed');
		throw error;
	}
}
