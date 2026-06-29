import { createSelector } from '@ngrx/store';
import { feedFeature } from './feed.reducer';
import { feedKey } from './feed.models';
import type { Collection } from '@bwfish/core';

export const { selectFeedState, selectActiveKey, selectFeeds } = feedFeature;

export const selectActiveFeed = createSelector(selectFeedState, selectActiveKey, selectFeeds, (state, activeKey, feeds) =>
  activeKey ? (feeds[activeKey] ?? null) : null,
);

export const selectActiveTimeline = createSelector(selectActiveFeed, feed => feed?.timeline ?? []);

export const selectActiveFeedLoading = createSelector(selectActiveFeed, feed => feed?.loading ?? false);

export const selectActiveFeedError = createSelector(selectActiveFeed, feed => feed?.error ?? null);

export const selectFeedByRef = (collection: Collection | null, refId: string | null) =>
  createSelector(selectFeeds, feeds => {
    if (!collection || !refId) return null;
    return feeds[feedKey(collection, refId)] ?? null;
  });

export const selectTimelineByRef = (collection: Collection | null, refId: string | null) =>
  createSelector(selectFeedByRef(collection, refId), feed => feed?.timeline ?? []);

export const selectFeedLoadingByRef = (collection: Collection | null, refId: string | null) =>
  createSelector(selectFeedByRef(collection, refId), feed => feed?.loading ?? false);

export const selectFeedErrorByRef = (collection: Collection | null, refId: string | null) =>
  createSelector(selectFeedByRef(collection, refId), feed => feed?.error ?? null);
