import chalk from 'chalk';
import ora from 'ora';
import { getFirestoreDb } from '../../../clients/firebase-admin';
import { getOpenAIClient } from '../../../clients/openai';
import type { AgentRunPayload } from '../../types';
import { toLogUsage, type LogUsage } from '../../../services/log';
import { instructions, MODERATE_INSTRUCTIONS, MODERATOR_MODEL, use } from './prompts';

export { use } from './prompts';

export const id = 'moderator';
export const title = 'Moderator';

export type ModerationLevel = 'info' | 'warning' | 'danger';

export interface ModeratorRunResult {
	level: 'ok' | ModerationLevel;
	text?: string;
	flagId?: string;
	blocked?: boolean;
	usage: LogUsage[];
}

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

function requireFeedIds(payload: AgentRunPayload): { feedId: string; userId: string } {
	const feedId = payload.feedId;
	const userId = payload.userId;

	if (!feedId || !userId) {
		throw new Error('Moderator requires feedId and userId on the payload');
	}

	return { feedId, userId };
}

async function classifyPost(
	payload: AgentRunPayload,
): Promise<{ level: ModeratorRunResult['level']; text: string; usage: LogUsage[] }> {
	const spinner = ora('Moderating feed entry').start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: MODERATOR_MODEL,
			instructions: instructions(MODERATE_INSTRUCTIONS),
			input: JSON.stringify({
				text: payload.message,
				context: payload.context,
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
			level: ModeratorRunResult['level'];
			text: string;
		};
		const usage = toLogUsage(response.usage, MODERATOR_MODEL);

		if (result.level === 'ok') {
			spinner.succeed('Feed entry approved');
		} else {
			spinner.succeed(`Flagged as ${result.level}`);
		}

		return {
			...result,
			usage: usage ? [usage] : [],
		};
	} catch (error) {
		spinner.fail('Moderation failed');
		throw error;
	}
}

async function insertFlag(
	data: Pick<ModeratorRunResult, 'level'> & {
		userId: string;
		feedId: string;
		text: string;
	},
): Promise<string> {
	const db = getFirestoreDb();
	const createdAt = new Date().toISOString();

	const doc = await db.collection('flags').add({
		createdAt,
		userId: data.userId,
		feedId: data.feedId,
		level: data.level,
		text: data.text,
	});

	return doc.id;
}

async function blockUser(userId: string): Promise<void> {
	const db = getFirestoreDb();

	await db.collection('users').doc(userId).set(
		{
			blocked: true,
			blockedAt: new Date().toISOString(),
		},
		{ merge: true },
	);
}

export async function run(payload: AgentRunPayload): Promise<ModeratorRunResult> {
	const { feedId, userId } = requireFeedIds(payload);
	const { level, text, usage } = await classifyPost(payload);

	if (level === 'ok') {
		return { level, usage };
	}

	const flagId = await insertFlag({
		feedId,
		userId,
		level,
		text: text.trim(),
	});

	let blocked = false;
	if (level === 'danger') {
		await blockUser(userId);
		blocked = true;
		console.log(chalk.red(`User ${userId} blocked`));
	}

	console.log(chalk.yellow(`Flag ${flagId} created (${level})`));

	return {
		level,
		text: text.trim() || undefined,
		flagId,
		blocked: blocked || undefined,
		usage,
	};
}
