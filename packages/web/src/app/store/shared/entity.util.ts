import type { Collection } from '@bwfish/core';
import type { ContentPageItem } from '../../components/page/page';

export function toContentPageItem<T extends { id: string; title: string; summary: string }>(
  entity: T,
  collection: Collection,
  extra?: Partial<ContentPageItem>,
): ContentPageItem {
  return {
    id: entity.id,
    title: entity.title,
    summary: entity.summary,
    collection,
    ...extra,
  };
}

export function listLoadingKey(scope: string, id: string) {
  return `${scope}:${id}`;
}

export function uncachedIds(ids: string[], entities: Record<string, unknown>, loading: Record<string, boolean>) {
  return ids.filter(id => !entities[id] && !loading[id]);
}
