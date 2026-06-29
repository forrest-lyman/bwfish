import { getFirestoreDb } from '../clients/firebase';

const COLLECTION = 'flags';

export async function getFlagsByUserId(userId: string): Promise<Record<string, unknown>[]> {
	const snap = await getFirestoreDb().collection(COLLECTION).where('userId', '==', userId).get();

	return snap.docs.map((doc) => doc.data());
}

export async function addFlag(data: {
	userId: string;
	feedId: string;
	level: string;
	text: string;
}): Promise<string> {
	const doc = await getFirestoreDb()
		.collection(COLLECTION)
		.add({
			createdAt: new Date().toISOString(),
			userId: data.userId,
			feedId: data.feedId,
			level: data.level,
			text: data.text,
		});

	return doc.id;
}
