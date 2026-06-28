import type { Collection } from '@bwfish/core';

export interface RefContext {
	collection: Collection;
	refId: string;
	entity: Record<string, unknown>;
	page: Record<string, unknown> | null;
}

export interface AgentRunPayload {
	message: string;
	context: RefContext | null;
}

export interface Agent {
	id: string;
	title: string;
	use: string;
	run: (payload: AgentRunPayload) => Promise<unknown>;
}
