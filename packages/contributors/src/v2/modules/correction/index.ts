import type { FeedEntry, FeedEntryStatus } from '@bwfish/core';
import { loadContributor } from './contributor';
import { buildDraftPath, createCorrectionDraft, loadDraftBody } from './draft';
import { evaluateEntry } from './evaluator';
import { saveAnswer, setFeedDraftPath, updateFeedStatus } from './feed';
import { logStep } from './log';
import * as publisher from './publisher';

function extractCorrectionPayload(payload: unknown): { text: string } | null {
	if (!payload || typeof payload !== 'object' || !('text' in payload)) {
		return null;
	}

	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? { text } : null;
}

async function ensureCorrectionDraft(feedEntry: FeedEntry): Promise<FeedEntry> {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required to create a correction draft');
	}

	if (feedEntry.draftPath) {
		return feedEntry;
	}

	const correction = extractCorrectionPayload(feedEntry.payload);
	if (!correction) {
		throw new Error('Correction feed entry requires payload.text with the proposed page body');
	}

	const draftPath = buildDraftPath(feedEntry.collection, feedEntry.refId, feedId);
	await createCorrectionDraft(draftPath, correction.text, feedId);
	await setFeedDraftPath(feedId, draftPath);

	return { ...feedEntry, draftPath };
}

async function loadCorrectionBody(feedEntry: FeedEntry): Promise<string> {
	if (feedEntry.draftPath) {
		const body = await loadDraftBody(feedEntry.draftPath);
		if (body) {
			return body;
		}
	}

	const correction = extractCorrectionPayload(feedEntry.payload);
	if (!correction) {
		throw new Error('Correction feed entry requires payload.text with the proposed page body');
	}

	return correction.text;
}

export async function run(feedEntry: FeedEntry): Promise<void> {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for correction processing');
	}

	let entry = await ensureCorrectionDraft(feedEntry);
	const { context, contributor } = await loadContributor(entry);
	const correction = { text: await loadCorrectionBody(entry) };

	entry = await evaluateEntry(entry, context, contributor, correction);

	const result = await publisher.run({
		message: entry.text,
		context,
		contributor,
		correction,
		evaluationScore: entry.score,
		feedId,
		userId: entry.createdBy,
	});

	const logText = [result.summary, result.text].filter(Boolean).join(' — ');
	await logStep(entry, logText, result.usage, ['publisher', publisher.id]);

	if (result.reply) {
		await logStep(entry, result.reply, [], ['publisher', publisher.id, 'reply']);
		await saveAnswer(feedId, entry.collection, entry.refId, publisher.id, result.reply);
	}

	const status: FeedEntryStatus =
		result.decision === 'publish' ? 'answered' : result.decision === 'reject' ? 'failed' : 'pending';

	await updateFeedStatus(feedId, status);
}
