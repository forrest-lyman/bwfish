import type { Collection } from '@bwfish/core';
import type { RefContext } from '../types';
import { getFirestoreDb } from '../clients/firebase';

export async function loadRefContext(collection: Collection, refId: string): Promise<RefContext> {
	const db = getFirestoreDb();
	const entitySnap = await db.collection(collection).doc(refId).get();

	if (!entitySnap.exists) {
		throw new Error(`Missing ${collection}/${refId} in Firestore`);
	}

	const pageSnap = await db.collection('pages').doc(`${collection}__${refId}`).get();

	return {
		collection,
		refId,
		entity: entitySnap.data() as Record<string, unknown>,
		page: pageSnap.exists ? (pageSnap.data() as Record<string, unknown>) : null,
	};
}
