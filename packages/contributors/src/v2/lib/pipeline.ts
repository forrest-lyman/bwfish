import type { FeedEntry, FeedEntryType } from '@bwfish/core';
import { loadRefContext } from './services/context';
import { claimNext, failEntry, logStep, updateFeedStatus } from './services/feed';
import { moderate } from './services/moderator';
import { validate } from './services/user';
import * as correction from '../modules/correction';
import * as observation from '../modules/observation';
import * as question from '../modules/question';

type ProcessableFeedEntryType = Exclude<FeedEntryType, 'answer'>;

const modules: Record<ProcessableFeedEntryType, { run: (entry: FeedEntry) => Promise<void> }> = {
	question,
	observation,
	correction,
};

export async function run(entry: FeedEntry): Promise<void> {
	if (entry.type === 'answer') {
		return;
	}

	const feedId = entry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for pipeline processing');
	}

	try {
		await validate(entry.createdBy);

		const context = await loadRefContext(entry.collection, entry.refId);
		const moderation = await moderate({
			feedId,
			userId: entry.createdBy,
			text: entry.text,
			context,
		});

		await logStep(
			entry,
			moderation.text ?? moderation.level,
			moderation.usage,
			['moderation'],
		);

		if (moderation.level === 'warning' || moderation.level === 'danger') {
			await updateFeedStatus(feedId, moderation.level);
			return;
		}

		await modules[entry.type as ProcessableFeedEntryType].run(entry);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await failEntry(entry, message);
		throw error;
	}
}

export async function runNext(): Promise<FeedEntry | null> {
	const entry = await claimNext();
	if (!entry) {
		return null;
	}

	await run(entry);
	return entry;
}
