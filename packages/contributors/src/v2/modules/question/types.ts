import type { FeedEntryType, HomePort } from '@bwfish/core';
import type { RefContext } from '../../lib/types';

export interface ContributorUser {
	displayName: string;
	boat?: string;
	homePort?: HomePort;
}

export interface ContributorEntry {
	type: FeedEntryType;
	text: string;
	collection: RefContext['collection'];
	refId: string;
	entity: Record<string, unknown>;
	page: Record<string, unknown> | null;
}

export interface ContributorContext {
	entry: ContributorEntry;
	user: ContributorUser;
}

export interface AgentRunPayload {
	message: string;
	context: RefContext | null;
	contributor?: ContributorContext;
	feedId?: string;
	userId?: string;
}

export interface Agent {
	id: string;
	title: string;
	use: string;
	run: (payload: AgentRunPayload) => Promise<unknown>;
}

export type { RefContext };
