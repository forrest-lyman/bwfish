import { createFeature, createReducer, on } from '@ngrx/store';
import { FeedActions } from './feed.actions';
import { createFeedSlice, initialFeedState } from './feed.models';

export const feedFeature = createFeature({
  name: 'feed',
  reducer: createReducer(
    initialFeedState,
    on(FeedActions.subscribe, (state, { collection, refId }) => {
      const key = `${collection}__${refId}`;
      return {
        ...state,
        activeKey: key,
        feeds: {
          ...state.feeds,
          [key]: createFeedSlice(collection, refId),
        },
      };
    }),
    on(FeedActions.unsubscribe, (state, { collection, refId }) => {
      const key = `${collection}__${refId}`;
      if (state.activeKey !== key) {
        return state;
      }

      return {
        ...state,
        activeKey: null,
      };
    }),
    on(FeedActions.timelineUpdated, (state, { key, timeline }) => {
      const feed = state.feeds[key];
      if (!feed) return state;

      return {
        ...state,
        feeds: {
          ...state.feeds,
          [key]: {
            ...feed,
            timeline,
            loading: false,
            error: null,
          },
        },
      };
    }),
    on(FeedActions.timelineFailed, (state, { key, error }) => {
      const feed = state.feeds[key];
      if (!feed) return state;

      return {
        ...state,
        feeds: {
          ...state.feeds,
          [key]: {
            ...feed,
            timeline: [],
            loading: false,
            error,
          },
        },
      };
    }),
    on(FeedActions.timelineCleared, (state, { key }) => {
      const feed = state.feeds[key];
      if (!feed) return state;

      return {
        ...state,
        feeds: {
          ...state.feeds,
          [key]: {
            ...feed,
            timeline: [],
            loading: false,
            error: null,
          },
        },
      };
    }),
    on(FeedActions.setTimeline, (state, { key, timeline }) => {
      const feed = state.feeds[key];
      if (!feed) return state;

      return {
        ...state,
        feeds: {
          ...state.feeds,
          [key]: {
            ...feed,
            timeline,
          },
        },
      };
    }),
  ),
});
