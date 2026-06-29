import { getFirestoreDb } from '../../lib/clients/firebase';

export async function updateFeedScore(feedId: string, score: number): Promise<void> {
	await getFirestoreDb().collection('feed').doc(feedId).update({
		score,
		lastModified: new Date().toISOString(),
	});
}
