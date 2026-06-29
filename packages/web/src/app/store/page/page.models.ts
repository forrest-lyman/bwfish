import type { Collection, Page } from '@bwfish/core';

export interface PageState {
  collection: Collection | null;
  id: string | null;
  page: Page | null;
  sourceBody: string;
  loading: boolean;
  error: string | null;
}

export const initialPageState: PageState = {
  collection: null,
  id: null,
  page: null,
  sourceBody: '',
  loading: false,
  error: null,
};

export function pageKey(collection: Collection, id: string) {
  return `${collection}__${id}`;
}
