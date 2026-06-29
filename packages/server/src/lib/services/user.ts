import { getFirestoreDb } from '../clients/firebase';
import { getFlagsByUserId } from './flags';

const BLOCKING_LEVELS = ['warning', 'danger'];

export async function validate(userId: string): Promise<void> {
	const userSnap = await getFirestoreDb().collection('users').doc(userId).get();
	if (!userSnap.exists) {
		throw new Error(`User not found: ${userId}`);
	}

	const flags = await getFlagsByUserId(userId);
	const blocking = flags.filter((flag) => BLOCKING_LEVELS.includes(String(flag.level)));

	if (blocking.length > 0) {
		throw new Error(`User ${userId} has blocking flags`);
	}
}

export async function block(userId: string): Promise<void> {
	await getFirestoreDb()
		.collection('users')
		.doc(userId)
		.set(
			{
				blocked: true,
				blockedAt: new Date().toISOString(),
			},
			{ merge: true },
		);
}
