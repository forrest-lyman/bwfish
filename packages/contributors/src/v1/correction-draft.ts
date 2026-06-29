import { getFirestoreDb } from "./clients/firebase-admin";

export function buildDraftPath(collection: string, refId: string, feedId: string): string {
	return `pages/${collection}__${refId}/drafts/${feedId}`;
}

export async function createCorrectionDraft(
	draftPath: string,
	body: string,
	feedId: string,
): Promise<void> {
	await getFirestoreDb().doc(draftPath).set({
		body: body.trim(),
		feedId,
		createdAt: new Date().toISOString(),
	});
}

export async function loadDraftBody(draftPath: string): Promise<string | null> {
	const snap = await getFirestoreDb().doc(draftPath).get();
	if (!snap.exists) {
		return null;
	}

	const body = snap.data()?.body;
	return typeof body === "string" ? body : null;
}
