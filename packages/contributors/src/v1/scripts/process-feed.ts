import type { FeedEntry, FeedEntryType } from '@bwfish/core';
import { normalizeFeedEntry } from '@bwfish/core';
import chalk from 'chalk';
import ora from 'ora';
import type { DocumentReference } from 'firebase-admin/firestore';
import { loadEnv } from '../src/clients/env';
import { getFirestoreDb } from '../src/clients/firebase-admin';
import { run as runPipeline } from '../src/pipeline';

loadEnv();

const PROCESSABLE_TYPES: FeedEntryType[] = ['question', 'observation', 'correction'];
const CLAIMABLE_TYPES = [...PROCESSABLE_TYPES, 'tip'] as const;

async function claimNextFeedEntry(): Promise<FeedEntry | null> {
	const db = getFirestoreDb();
	const snap = await db
		.collection('feed')
		.where('type', 'in', [...CLAIMABLE_TYPES])
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
			throw new Error('Feed entry disappeared before it could be claimed');
		}

		if (fresh.data()?.status !== 'new') {
			throw new Error('Feed entry was already claimed');
		}

		tx.update(ref, {
			status: 'pending',
			lastModified: new Date().toISOString(),
		});
	});

	return normalizeFeedEntry({ id: doc.id, ...(doc.data() as Omit<FeedEntry, 'id'>) });
}

async function setFeedEntryFailed(ref: DocumentReference): Promise<void> {
	await ref.update({
		status: 'failed',
		lastModified: new Date().toISOString(),
	});
}

async function main(): Promise<void> {
	const claimSpinner = ora('Claiming next feed entry').start();
	let entry: FeedEntry | null;

	try {
		entry = await claimNextFeedEntry();
		if (!entry) {
			claimSpinner.info('No new feed entries to process');
			return;
		}

		claimSpinner.succeed(`Claimed ${entry.type} ${entry.id}`);
	} catch (error) {
		claimSpinner.fail('Failed to claim feed entry');
		throw error;
	}

	const entryRef = getFirestoreDb().collection('feed').doc(entry.id!);

	try {
		const pipelineSpinner = ora('Running pipeline').start();
		await runPipeline(entry);
		pipelineSpinner.succeed('Pipeline finished');
	} catch (error) {
		await setFeedEntryFailed(entryRef);
		throw error;
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`\nError: ${message}`));
	process.exit(1);
});
