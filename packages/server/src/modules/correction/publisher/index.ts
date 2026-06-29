import chalk from 'chalk';
import ora from 'ora';
import { getFirestoreDb } from '../../../lib/clients/firebase';
import { getOpenAIClient } from '../../../lib/clients/openai';
import type { AgentRunPayload } from '../types';
import { toLogUsage, type LogUsage } from '../../../lib/services/log';
import {
	PUBLISHER_MODEL,
	REPLY_INSTRUCTIONS,
	REPLY_MAX_LENGTH,
	REPLY_MODEL,
	REVIEW_INSTRUCTIONS,
	REVIEW_REPLY_INSTRUCTIONS,
} from './prompts';

export const id = 'bwfish-publisher';
export const AUTO_PUBLISH_MIN_SCORE = 50;

export type PublisherDecision = 'publish' | 'reject' | 'review';

export interface PublisherRunResult {
	decision: PublisherDecision;
	summary: string;
	explanationMatches: boolean;
	text?: string;
	reply?: string;
	published?: boolean;
	usage: LogUsage[];
}

const reviewSchema = {
	type: 'object',
	properties: {
		decision: {
			type: 'string',
			enum: ['publish', 'reject', 'review'],
		},
		summary: { type: 'string' },
		explanationMatches: { type: 'boolean' },
		text: { type: 'string' },
	},
	required: ['decision', 'summary', 'explanationMatches', 'text'],
	additionalProperties: false,
} as const;

interface CorrectionInput {
	originalBody: string;
	proposedBody: string;
	explanation: string;
	collection: string;
	refId: string;
}

function requireCorrectionInput(payload: AgentRunPayload): CorrectionInput {
	const originalBody =
		typeof payload.context?.page?.body === 'string' ? payload.context.page.body : '';
	const proposedBody = payload.correction?.text ?? '';
	const explanation = payload.message.trim();
	const collection = payload.context?.collection ?? payload.contributor?.entry.collection;
	const refId = payload.context?.refId ?? payload.contributor?.entry.refId;

	if (!originalBody) {
		throw new Error('Publisher requires the original page body in context.page.body');
	}

	if (!proposedBody.trim()) {
		throw new Error('Publisher requires correction.text with the proposed page body');
	}

	if (!explanation) {
		throw new Error('Publisher requires the contributor explanation in message');
	}

	if (!collection || !refId) {
		throw new Error('Publisher requires collection and refId on the payload context');
	}

	return { originalBody, proposedBody, explanation, collection, refId };
}

async function reviewCorrection(
	input: CorrectionInput,
): Promise<{
	decision: PublisherDecision;
	summary: string;
	explanationMatches: boolean;
	text: string;
	usage: LogUsage[];
}> {
	const spinner = ora('Reviewing correction').start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: PUBLISHER_MODEL,
			instructions: REVIEW_INSTRUCTIONS,
			input: JSON.stringify({
				originalBody: input.originalBody,
				proposedBody: input.proposedBody,
				explanation: input.explanation,
				page: {
					collection: input.collection,
					refId: input.refId,
				},
			}),
			text: {
				format: {
					type: 'json_schema',
					name: 'correction_review',
					strict: true,
					schema: reviewSchema,
				},
			},
		});

		const result = JSON.parse(response.output_text) as {
			decision: PublisherDecision;
			summary: string;
			explanationMatches: boolean;
			text: string;
		};
		const usage = toLogUsage(response.usage, PUBLISHER_MODEL);

		if (result.decision === 'publish') {
			spinner.succeed('Correction approved for publishing');
		} else {
			spinner.succeed(`Correction marked as ${result.decision}`);
		}

		return {
			...result,
			usage: usage ? [usage] : [],
		};
	} catch (error) {
		spinner.fail('Correction review failed');
		throw error;
	}
}

async function publishPage(collection: string, refId: string, body: string): Promise<void> {
	const db = getFirestoreDb();
	const pageId = `${collection}__${refId}`;
	const pageRef = db.collection('pages').doc(pageId);
	const pageSnap = await pageRef.get();

	if (!pageSnap.exists) {
		throw new Error(`Missing pages/${pageId} in Firestore`);
	}

	const page = pageSnap.data() as Record<string, unknown>;
	const previousBody = typeof page.body === 'string' ? page.body : '';
	const versionId = `v-${Date.now()}`;

	await pageRef.collection('versions').doc(versionId).set({
		body: previousBody,
		savedAt: new Date().toISOString(),
	});

	await pageRef.set(
		{
			...page,
			body: body.trim(),
		},
		{ merge: true },
	);
}

async function craftReply(
	input: CorrectionInput,
	summary: string,
	replyInstructions: string,
): Promise<{ reply: string; usage: LogUsage[] }> {
	const spinner = ora('Writing reply').start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: REPLY_MODEL,
			instructions: replyInstructions,
			input: JSON.stringify({
				explanation: input.explanation,
				summary,
				page: {
					collection: input.collection,
					refId: input.refId,
				},
			}),
		});

		const reply = response.output_text.trim().slice(0, REPLY_MAX_LENGTH);
		const usage = toLogUsage(response.usage, REPLY_MODEL);
		spinner.succeed('Reply ready');

		return { reply, usage: usage ? [usage] : [] };
	} catch (error) {
		spinner.fail('Failed to write reply');
		throw error;
	}
}

async function returnHeldForReview(
	input: CorrectionInput,
	data: Pick<PublisherRunResult, 'summary' | 'explanationMatches' | 'text'> & { usage: LogUsage[] },
): Promise<PublisherRunResult> {
	const { reply, usage: replyUsage } = await craftReply(input, data.summary, REVIEW_REPLY_INSTRUCTIONS);
	console.log(chalk.yellow('\nReview reply:'));
	console.log(chalk.yellow(reply));

	return {
		decision: 'review',
		summary: data.summary,
		explanationMatches: data.explanationMatches,
		text: data.text,
		reply,
		usage: [...data.usage, ...replyUsage],
	};
}

export async function run(payload: AgentRunPayload): Promise<PublisherRunResult> {
	const input = requireCorrectionInput(payload);
	const { decision, summary, explanationMatches, text, usage } = await reviewCorrection(input);

	if (decision === 'reject') {
		console.log(chalk.yellow('Correction not published (reject)'));
		if (text.trim()) {
			console.log(chalk.yellow(text.trim()));
		}

		return {
			decision,
			summary,
			explanationMatches,
			text: text.trim() || undefined,
			usage,
		};
	}

	if (decision === 'review') {
		console.log(chalk.yellow('Correction held for review'));
		if (text.trim()) {
			console.log(chalk.yellow(text.trim()));
		}

		return returnHeldForReview(input, {
			summary,
			explanationMatches,
			text: text.trim() || undefined,
			usage,
		});
	}

	const score = payload.evaluationScore;
	if (score === undefined || score < AUTO_PUBLISH_MIN_SCORE) {
		const reviewNote =
			score !== undefined
				? `Score ${score}/100 is below the ${AUTO_PUBLISH_MIN_SCORE} auto-publish threshold.`
				: 'Missing evaluation score for auto-publish.';
		console.log(chalk.yellow(`Correction held for review — ${reviewNote}`));

		return returnHeldForReview(input, {
			summary,
			explanationMatches,
			text: [text.trim(), reviewNote].filter(Boolean).join(' '),
			usage,
		});
	}

	await publishPage(input.collection, input.refId, input.proposedBody);
	console.log(chalk.green(`Published correction to pages/${input.collection}__${input.refId}`));

	const { reply, usage: replyUsage } = await craftReply(input, summary, REPLY_INSTRUCTIONS);
	console.log(chalk.green('\nReply:'));
	console.log(chalk.green(reply));

	return {
		decision,
		summary,
		explanationMatches,
		reply,
		published: true,
		usage: [...usage, ...replyUsage],
	};
}
