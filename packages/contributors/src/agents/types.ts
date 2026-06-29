import type { Collection, FeedEntryType, HomePort } from '@bwfish/core';

export interface RefContext {
	collection: Collection;
	refId: string;
	entity: Record<string, unknown>;
	page: Record<string, unknown> | null;
}

export interface ContributorUser {
	displayName: string;
	boat?: string;
	homePort?: HomePort;
}

export interface ContributorEntry {
	type: FeedEntryType;
	text: string;
	collection: Collection;
	refId: string;
	entity: Record<string, unknown>;
	page: Record<string, unknown> | null;
}

export interface ContributorContext {
	entry: ContributorEntry;
	user: ContributorUser;
}

export interface CorrectionPayload {
	text: string;
}

export interface AgentRunPayload {
	message: string;
	context: RefContext | null;
	contributor?: ContributorContext;
	correction?: CorrectionPayload;
	entryType?: FeedEntryType;
	payload?: unknown;
	evaluationScore?: number;
	feedId?: string;
	userId?: string;
}

export interface Agent {
	id: string;
	title: string;
	use: string;
	run: (payload: AgentRunPayload) => Promise<unknown>;
}
