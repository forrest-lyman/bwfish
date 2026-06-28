import type { FeedEntry, FeedEntryStatus, FeedEntryType } from "@bwfish/core";
import { moderator } from "./agents/managers";
import type { ContributorContext, RefContext } from "./agents/types";
import { buildContributorContext } from "./build-contributor-context";
import { getFirestoreDb } from "./clients/firebase-admin";
import { loadRefContext } from "./load-ref-context";
import { loadUserProfile } from "./load-user-profile";
import { orchestrate } from "./orchestrator";
import { logFeed, type LogUsage } from "./services/log";

type FeedEntryHandler = (
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) => Promise<void>;

type ProcessableFeedEntryType = Exclude<FeedEntryType, "answer">;

const handlers: Record<ProcessableFeedEntryType, FeedEntryHandler> = {
	question: handleQuestion,
	tip: handleTip,
	correction: handleCorrection,
};

export async function run(feedEntry: FeedEntry) {
	if (feedEntry.type === "answer") {
		return;
	}

	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error("Feed entry id is required for pipeline processing");
	}

	const [context, user] = await Promise.all([
		loadRefContext(feedEntry.collection, feedEntry.refId),
		loadUserProfile(feedEntry.createdBy),
	]);
	const contributor = buildContributorContext(feedEntry, context, user);

	const moderation = await moderator.run({
		message: feedEntry.text,
		context,
		feedId,
		userId: feedEntry.createdBy,
	});

	await logPipelineStep(feedEntry, moderation.text ?? moderation.level, moderation.usage, ["moderation"]);

	if (moderation.level === "warning" || moderation.level === "danger") {
		await setFeedEntryStatus(feedId, moderation.level);
		return;
	}

	await handlers[feedEntry.type](feedEntry, context, contributor);
}

async function logPipelineStep(
	feedEntry: FeedEntry,
	text: string,
	usage: LogUsage[],
	tags: string[],
): Promise<void> {
	const feedId = feedEntry.id;
	if (!feedId) {
		return;
	}

	await logFeed({
		feedId,
		userId: feedEntry.createdBy,
		status: feedEntry.type,
		text,
		usage,
		tags,
	});
}

async function setFeedEntryStatus(feedId: string, status: FeedEntryStatus): Promise<void> {
	await getFirestoreDb().collection("feed").doc(feedId).update({
		status,
		lastModified: new Date().toISOString(),
	});
}

function extractAnswer(result: unknown): string {
	if (typeof result === "string") {
		return result;
	}

	if (result && typeof result === "object" && "answer" in result) {
		const answer = (result as { answer?: unknown }).answer;
		if (typeof answer === "string") {
			return answer;
		}
	}

	return JSON.stringify(result);
}

function requireAdminUid(): string {
	const adminUid = process.env.BWFISH_ADMIN_UID;
	if (!adminUid) {
		throw new Error("BWFISH_ADMIN_UID is not set");
	}

	return adminUid;
}

async function saveAnswer(question: FeedEntry, agentId: string, text: string): Promise<string> {
	const now = new Date().toISOString();
	const doc = await getFirestoreDb().collection("feed").add({
		type: "answer",
		text,
		collection: question.collection,
		refId: question.refId,
		createdBy: requireAdminUid(),
		createdAt: now,
		lastModified: now,
		score: 0,
		replyTo: question.id,
		agentId,
	});

	return doc.id;
}

/**
 * type: 'correction'
 */
async function handleCorrection(
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) {}

/**
 * type: 'question'
 */
async function handleQuestion(
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error("Feed entry id is required for question processing");
	}

	const result = await orchestrate({
		message: feedEntry.text,
		context,
		contributor,
	});

	await logPipelineStep(
		feedEntry,
		result.agentIds.length ? `Selected agents: ${result.agentIds.join(", ")}` : "No agents selected",
		result.usage.orchestration,
		["orchestration"],
	);

	for (const agentId of result.agentIds) {
		const answer = extractAnswer(result.results[agentId]);

		await logPipelineStep(feedEntry, answer, result.usage.agents[agentId] ?? [], ["agent", agentId]);
		await saveAnswer(feedEntry, agentId, answer);
	}

	await setFeedEntryStatus(feedId, "answered");
}

/**
 * type: 'tip'
 */
async function handleTip(
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) {}
