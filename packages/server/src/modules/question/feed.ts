import { getFirestoreDb } from '../../lib/clients/firebase';

export async function updateFeedScore(feedId: string, score: number): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		score,
		lastModified: new Date().toISOString(),
	});
}

function requireAdminUid(): string {
	const adminUid = process.env.BWFISH_ADMIN_UID;
	if (!adminUid) {
		throw new Error('BWFISH_ADMIN_UID is not set');
	}

	return adminUid;
}

export async function saveAnswer(
	questionId: string,
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
		replyTo: questionId,
		agentId,
	});

	return doc.id;
}

export async function markAnswered(feedId: string): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		status: 'answered',
		lastModified: new Date().toISOString(),
	});
}
