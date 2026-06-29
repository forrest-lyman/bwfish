import type { FeedEntry } from '@bwfish/core';
import type { ContributorContext, ContributorUser, RefContext } from './agents/types';

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
