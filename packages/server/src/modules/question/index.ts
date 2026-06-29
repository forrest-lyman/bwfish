import type { FeedEntry } from '@bwfish/core';
import { loadContributor } from './contributor';
import { evaluateEntry } from './evaluator';
import { markAnswered, saveAnswer } from './feed';
import { logStep } from './log';
import { orchestrate } from './orchestrator';

function extractAnswer(result: unknown): string {
	if (typeof result === 'string') {
		return result;
	}

	if (result && typeof result === 'object' && 'answer' in result) {
		const answer = (result as { answer?: unknown }).answer;
		if (typeof answer === 'string') {
			return answer;
		}
	}

	return JSON.stringify(result);
}

export async function run(feedEntry: FeedEntry): Promise<void> {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error('Feed entry id is required for question processing');
	}

	const { context, contributor } = await loadContributor(feedEntry);
	await evaluateEntry(feedEntry, context, contributor);

	const result = await orchestrate({
		message: feedEntry.text,
		context,
		contributor,
		feedId,
		userId: feedEntry.createdBy,
	});

	await logStep(
		feedEntry,
		result.agentIds.length ? `Selected agents: ${result.agentIds.join(', ')}` : 'No agents selected',
		result.usage.orchestration,
		['orchestration'],
	);

	for (const agentId of result.agentIds) {
		const answer = extractAnswer(result.results[agentId]);

		await logStep(feedEntry, answer, result.usage.agents[agentId] ?? [], ['agent', agentId]);
		await saveAnswer(feedId, feedEntry.collection, feedEntry.refId, agentId, answer);
	}

	await markAnswered(feedId);
}
