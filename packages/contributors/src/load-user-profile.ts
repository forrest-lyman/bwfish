import type { HomePort, UserProfile } from '@bwfish/core';
import { getFirestoreDb } from './clients/firebase-admin';
import type { ContributorUser } from './agents/types';

export async function loadUserProfile(uid: string): Promise<ContributorUser> {
	const snap = await getFirestoreDb().collection('users').doc(uid).get();

	if (!snap.exists) {
		return { displayName: 'Angler' };
	}

	const data = snap.data() as Partial<UserProfile>;

	return {
		displayName: data.displayName?.trim() || 'Angler',
		boat: data.boat?.trim() || undefined,
		homePort: data.homePort as HomePort | undefined,
	};
}
