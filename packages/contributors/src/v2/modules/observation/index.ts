import type { FeedEntry } from '@bwfish/core';
import { loadContributor } from './contributor';
import { evaluateEntry } from './evaluator';

export async function run(feedEntry: FeedEntry): Promise<void> {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for observation processing');
	}

	const { context, contributor } = await loadContributor(feedEntry);
	await evaluateEntry(feedEntry, context, contributor);
}
