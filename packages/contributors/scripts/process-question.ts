import type { Collection } from '@bwfish/core';
import chalk from 'chalk';
import ora from 'ora';
import type { DocumentReference } from 'firebase-admin/firestore';
import { loadEnv } from '../src/clients/env';
import { getFirestoreDb } from '../src/clients/firebase-admin';
import { loadRefContext } from '../src/load-ref-context';
import { selectAgents } from '../src/orchestrator';

loadEnv();

const ADMIN_UID = process.env.BWFISH_ADMIN_UID;
if (!ADMIN_UID) {
	throw new Error('BWFISH_ADMIN_UID is not set');
}

interface QuestionEntry {
	id: string;
	type: 'question';
	text: string;
	collection: Collection;
	refId: string;
	createdBy: string;
	createdAt: string;
	lastModified: string;
	status?: string;
}

function extractAnswer(result: unknown): string {
	if (typeof result === 'string') {
		return result;
	}

	if (result && typeof result === 'object' && 'answer' in result) {
		const answer = (result as { answer?: unknown }).answer;
		if (typeof answer === 'string') {
			return answer;
		}
	}

	return JSON.stringify(result);
}

async function claimNextQuestion(): Promise<QuestionEntry | null> {
	const db = getFirestoreDb();
	const snap = await db
		.collection('feed')
		.where('type', '==', 'question')
		.where('status', '==', 'new')
		.orderBy('createdAt', 'asc')
		.limit(1)
		.get();

	if (snap.empty) {
		return null;
	}

	const doc = snap.docs[0];
	const ref = doc.ref;

	await db.runTransaction(async (tx) => {
		const fresh = await tx.get(ref);
		if (!fresh.exists) {
			throw new Error('Question disappeared before it could be claimed');
		}

		if (fresh.data()?.status !== 'new') {
			throw new Error('Question was already claimed');
		}

		tx.update(ref, {
			status: 'pending',
			lastModified: new Date().toISOString(),
		});
	});

	return { id: doc.id, ...(doc.data() as Omit<QuestionEntry, 'id'>) };
}

async function saveAnswer(question: QuestionEntry, agentId: string, text: string): Promise<string> {
	const db = getFirestoreDb();
	const now = new Date().toISOString();

	const doc = await db.collection('feed').add({
		type: 'answer',
		text,
		collection: question.collection,
		refId: question.refId,
		createdBy: ADMIN_UID,
		createdAt: now,
		lastModified: now,
		score: 0,
		replyTo: question.id,
		agentId,
	});

	return doc.id;
}

async function setQuestionStatus(
	ref: DocumentReference,
	status: 'answered' | 'failed',
): Promise<void> {
	await ref.update({
		status,
		lastModified: new Date().toISOString(),
	});
}

async function main(): Promise<void> {
	const claimSpinner = ora('Claiming next question').start();
	let question: QuestionEntry | null;

	try {
		question = await claimNextQuestion();
		if (!question) {
			claimSpinner.info('No new questions to process');
			return;
		}

		claimSpinner.succeed(`Claimed question ${question.id}`);
	} catch (error) {
		claimSpinner.fail('Failed to claim question');
		throw error;
	}

	const questionRef = getFirestoreDb().collection('feed').doc(question.id);

	try {
		const contextSpinner = ora('Loading page context').start();
		const context = await loadRefContext(question.collection, question.refId);
		contextSpinner.succeed('Page context loaded');
		console.log(chalk.dim(JSON.stringify(context, null, 2)));

		const payload = { message: question.text, context };

		const routeSpinner = ora('Selecting agents').start();
		const { agents: selectedAgents } = await selectAgents(payload);
		routeSpinner.succeed(
			selectedAgents.length
				? `Selected agents: ${selectedAgents.map((agent) => agent.id).join(', ')}`
				: 'No agents matched this question',
		);

		for (const agent of selectedAgents) {
			const runSpinner = ora(`Running ${agent.title}`).start();

			try {
				const result = await agent.run(payload);
				const answer = extractAnswer(result);
				const replyId = await saveAnswer(question, agent.id, answer);
				runSpinner.succeed(`Saved answer from ${agent.id} as ${replyId}`);
				console.log(chalk.green(answer));
			} catch (error) {
				runSpinner.fail(`${agent.id} failed`);
				throw error;
			}
		}

		await setQuestionStatus(questionRef, 'answered');
		console.log(chalk.green(`\nQuestion ${question.id} marked answered`));
	} catch (error) {
		await setQuestionStatus(questionRef, 'failed');
		throw error;
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`\nError: ${message}`));
	process.exit(1);
});
