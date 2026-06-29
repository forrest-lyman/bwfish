import type { FeedEntryStatus } from '@bwfish/core';
import { getFirestoreDb } from '../../lib/clients/firebase';

function requireAdminUid(): string {
	const adminUid = process.env.BWFISH_ADMIN_UID;
	if (!adminUid) {
		throw new Error('BWFISH_ADMIN_UID is not set');
	}

	return adminUid;
}

export async function updateFeedScore(feedId: string, score: number): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		score,
		lastModified: new Date().toISOString(),
	});
}

export async function setFeedDraftPath(feedId: string, draftPath: string): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		draftPath,
		lastModified: new Date().toISOString(),
	});
}

export async function saveAnswer(
	correctionId: string,
	collection: string,
	refId: string,
	agentId: string,
	text: string,
): Promise<string> {
	const now = new Date().toISOString();
	const doc = await getFirestoreDb().collection('feed').add({
		type: 'answer',
		text,
		collection,
		refId,
		createdBy: requireAdminUid(),
		createdAt: now,
		lastModified: now,
		score: 0,
		replyTo: correctionId,
		agentId,
	});

	return doc.id;
}

export async function updateFeedStatus(feedId: string, status: FeedEntryStatus): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		status,
		lastModified: new Date().toISOString(),
	});
}
