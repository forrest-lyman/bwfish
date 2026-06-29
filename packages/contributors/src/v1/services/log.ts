import type { FeedEntryType } from "@bwfish/core";
import { getFirestoreDb } from "../clients/firebase-admin";

export interface LogUsage {
	isl: number;
	osl: number;
	model: string;
	cost: number;
}

interface ModelPricing {
	inputPerMillion: number;
	outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
	"gpt-5-nano": { inputPerMillion: 0.05, outputPerMillion: 0.4 },
	"gpt-5-mini": { inputPerMillion: 0.25, outputPerMillion: 2.0 },
};

function getModelPricing(model: string): ModelPricing | null {
	if (MODEL_PRICING[model]) {
		return MODEL_PRICING[model];
	}

	const baseModel = Object.keys(MODEL_PRICING).find((key) => model.startsWith(`${key}-`));
	return baseModel ? MODEL_PRICING[baseModel] : null;
}

export function estimateUsageCost(isl: number, osl: number, model: string): number {
	const pricing = getModelPricing(model);
	if (!pricing) {
		return 0;
	}

	return (isl / 1_000_000) * pricing.inputPerMillion + (osl / 1_000_000) * pricing.outputPerMillion;
}

export interface FeedLogEntry {
	type: "feed";
	feedId: string;
	userId: string;
	createdAt: string;
	status: FeedEntryType;
	text: string;
	usage: LogUsage[];
	tags?: string[];
}

export type FeedLogInput = Omit<FeedLogEntry, "type" | "createdAt"> & {
	createdAt?: string;
};

export function toLogUsage(
	usage: { input_tokens?: number; output_tokens?: number } | null | undefined,
	model: string,
): LogUsage | null {
	if (!usage) {
		return null;
	}

	return {
		isl: usage.input_tokens ?? 0,
		osl: usage.output_tokens ?? 0,
		model,
		cost: estimateUsageCost(usage.input_tokens ?? 0, usage.output_tokens ?? 0, model),
	};
}

export function extractAgentUsage(result: unknown): LogUsage[] {
	if (result && typeof result === "object" && "usage" in result) {
		const usage = (result as { usage?: unknown }).usage;
		if (Array.isArray(usage)) {
			return usage as LogUsage[];
		}
	}

	return [];
}

export async function logFeed(entry: FeedLogInput): Promise<string> {
	const doc = await getFirestoreDb().collection("log").add({
		type: "feed",
		feedId: entry.feedId,
		userId: entry.userId,
		createdAt: entry.createdAt ?? new Date().toISOString(),
		status: entry.status,
		text: entry.text,
		usage: entry.usage,
		...(entry.tags ? { tags: entry.tags } : {}),
	} satisfies FeedLogEntry);

	return doc.id;
}
