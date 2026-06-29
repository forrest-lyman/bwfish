import type { Collection } from '@bwfish/core';

export interface RefContext {
	collection: Collection;
	refId: string;
	entity: Record<string, unknown>;
	page: Record<string, unknown> | null;
}
