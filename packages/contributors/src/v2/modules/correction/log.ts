import type { FeedEntry } from '@bwfish/core';
import { logFeed, type LogUsage } from '../../lib/services/log';

export async function logStep(
	entry: FeedEntry,
	text: string,
	usage: LogUsage[],
	tags: string[],
): Promise<void> {
	const feedId = entry.id;
	if (!feedId) {
		return;
	}

	await logFeed({
		feedId,
		userId: entry.createdBy,
		status: entry.type,
		text,
		usage,
		tags,
	});
}
