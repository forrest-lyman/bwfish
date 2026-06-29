import type { FeedEntry, FeedEntryStatus, FeedEntryType } from "@bwfish/core";
import { bwfishEvaluator, bwfishPublisher, moderator } from "./agents/managers";
import type { ContributorContext, RefContext } from "./agents/types";
import { buildContributorContext } from "./build-contributor-context";
import { buildDraftPath, createCorrectionDraft, loadDraftBody } from "./correction-draft";
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
	observation: handleObservation,
	correction: handleCorrection,
};

export async function run(feedEntry: FeedEntry) {
	if (feedEntry.type === "answer") {
		return;
	}

	let entry = feedEntry;
	const feedId = entry.id;
	if (!feedId) {
		throw new Error("Feed entry id is required for pipeline processing");
	}

	const [context, user] = await Promise.all([
		loadRefContext(entry.collection, entry.refId),
		loadUserProfile(entry.createdBy),
	]);
	const contributor = buildContributorContext(entry, context, user);

	if (entry.type === "correction") {
		entry = await ensureCorrectionDraft(entry);
	}

	const moderation = await moderator.run({
		message: entry.text,
		context,
		feedId,
		userId: entry.createdBy,
	});

	await logPipelineStep(entry, moderation.text ?? moderation.level, moderation.usage, ["moderation"]);

	if (moderation.level === "warning" || moderation.level === "danger") {
		await setFeedEntryStatus(feedId, moderation.level);
		return;
	}

	const evaluation = await bwfishEvaluator.run({
		message: entry.text,
		context,
		contributor,
		entryType: entry.type,
		payload: entry.payload,
		correction:
			entry.type === "correction"
				? { text: await loadCorrectionBody(entry) }
				: extractCorrectionPayload(entry.payload) ?? undefined,
		feedId,
		userId: entry.createdBy,
	});

	await logPipelineStep(
		entry,
		`Score ${evaluation.score}/100 — ${evaluation.text}`,
		evaluation.usage,
		["evaluator", bwfishEvaluator.id],
	);
	await setFeedEntryScore(feedId, evaluation.score);
	entry = { ...entry, score: evaluation.score };

	await handlers[entry.type as ProcessableFeedEntryType](entry, context, contributor);
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

async function setFeedEntryScore(feedId: string, score: number): Promise<void> {
	await getFirestoreDb().collection("feed").doc(feedId).update({
		score,
		lastModified: new Date().toISOString(),
	});
}

async function setFeedDraftPath(feedId: string, draftPath: string): Promise<void> {
	await getFirestoreDb().collection("feed").doc(feedId).update({
		draftPath,
		lastModified: new Date().toISOString(),
	});
}

async function ensureCorrectionDraft(feedEntry: FeedEntry): Promise<FeedEntry> {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error("Feed entry id is required to create a correction draft");
	}

	if (feedEntry.draftPath) {
		return feedEntry;
	}

	const correction = extractCorrectionPayload(feedEntry.payload);
	if (!correction) {
		throw new Error("Correction feed entry requires payload.text with the proposed page body");
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
		throw new Error("Correction feed entry requires payload.text with the proposed page body");
	}

	return correction.text;
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

function extractCorrectionPayload(payload: unknown): { text: string } | null {
	if (!payload || typeof payload !== "object" || !("text" in payload)) {
		return null;
	}

	const text = (payload as { text?: unknown }).text;
	return typeof text === "string" ? { text } : null;
}

/**
 * type: 'correction'
 */
async function handleCorrection(
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) {
	const feedId = feedEntry.id;
	if (!feedId) {
		throw new Error("Feed entry id is required for correction processing");
	}

	const correction = { text: await loadCorrectionBody(feedEntry) };

	const result = await bwfishPublisher.run({
		message: feedEntry.text,
		context,
		contributor,
		correction,
		evaluationScore: feedEntry.score,
		feedId,
		userId: feedEntry.createdBy,
	});

	const logText = [result.summary, result.text].filter(Boolean).join(" — ");
	await logPipelineStep(feedEntry, logText, result.usage, ["publisher", bwfishPublisher.id]);

	if (result.reply) {
		await logPipelineStep(feedEntry, result.reply, [], ["publisher", bwfishPublisher.id, "reply"]);
		await saveAnswer(feedEntry, bwfishPublisher.id, result.reply);
	}

	const status: FeedEntryStatus =
		result.decision === "publish" ? "answered" : result.decision === "reject" ? "failed" : "pending";

	await setFeedEntryStatus(feedId, status);
}

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
 * type: 'observation'
 */
async function handleObservation(
	feedEntry: FeedEntry,
	context: RefContext,
	contributor: ContributorContext,
) {}
