import type { FeedEntry, HomePort, UserProfile } from '@bwfish/core';
import { getFirestoreDb } from '../../lib/clients/firebase';
import { loadRefContext } from '../../lib/services/context';
import type { ContributorContext, ContributorUser, RefContext } from './types';

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

export function buildContributorContext(
	feedEntry: FeedEntry,
	refContext: RefContext,
	user: ContributorUser,
): ContributorContext {
	return {
		entry: {
			type: feedEntry.type,
			text: feedEntry.text,
			collection: feedEntry.collection,
			refId: feedEntry.refId,
			entity: refContext.entity,
			page: refContext.page,
		},
		user,
	};
}

export async function loadContributor(entry: FeedEntry): Promise<{
	context: RefContext;
	contributor: ContributorContext;
}> {
	const [context, user] = await Promise.all([
		loadRefContext(entry.collection, entry.refId),
		loadUserProfile(entry.createdBy),
	]);

	return {
		context,
		contributor: buildContributorContext(entry, context, user),
	};
}
