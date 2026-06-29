import type { FeedEntry, FeedEntryStatus, FeedEntryType } from '@bwfish/core';
import { normalizeFeedEntry } from '@bwfish/core';
import { getFirestoreDb } from '../clients/firebase';
import { logFeed, type LogUsage } from './log';

const COLLECTION = 'feed';

const PROCESSABLE_TYPES: FeedEntryType[] = ['question', 'observation', 'correction'];
const CLAIMABLE_TYPES = [...PROCESSABLE_TYPES, 'tip'] as const;

export async function updateFeedStatus(feedId: string, status: FeedEntryStatus): Promise<void> {
	await getFirestoreDb().collection(COLLECTION).doc(feedId).update({
		status,
		lastModified: new Date().toISOString(),
	});
}

export async function claimNext(): Promise<FeedEntry | null> {
	const db = getFirestoreDb();
	const snap = await db
		.collection(COLLECTION)
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

export async function logStep(
	entry: FeedEntry,
	text: string,
	usage: LogUsage[],
	tags: string[],
): Promise<void> {
	const feedId = entry.id;
	if (!feedId) {
		return;
	}

	await logFeed({
		feedId,
		userId: entry.createdBy,
		status: entry.type,
		text,
		usage,
		tags,
	});
}

export async function failEntry(entry: FeedEntry, message: string): Promise<void> {
	const feedId = entry.id;
	const label = feedId ? `${entry.type} ${feedId}` : entry.type;
	console.error(`Feed entry failed (${label}): ${message}`);

	if (!feedId) {
		return;
	}

	await updateFeedStatus(feedId, 'failed');
	await logStep(entry, message, [], ['error']);
}
