import { getFirestoreDb } from '../clients/firebase';

const COLLECTION = 'settings';

function settingsRef(id: string) {
	return getFirestoreDb().collection(COLLECTION).doc(id);
}

export async function getSettings(id: string): Promise<Record<string, unknown> | null> {
	const snap = await settingsRef(id).get();
	if (!snap.exists) {
		return null;
	}

	return snap.data() as Record<string, unknown>;
}

export async function setSettings(id: string, data: Record<string, unknown>): Promise<void> {
	await settingsRef(id).set(data);
}

export async function updateSettings(id: string, data: Record<string, unknown>): Promise<void> {
	await settingsRef(id).update(data);
}
