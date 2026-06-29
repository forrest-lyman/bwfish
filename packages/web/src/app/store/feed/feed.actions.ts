import { createActionGroup, props } from '@ngrx/store';
import type { Collection } from '@bwfish/core';
import type { FeedTimelineItem } from '../../components/feed-entry/feed-entry';

export const FeedActions = createActionGroup({
  source: 'Feed',
  events: {
    Subscribe: props<{ collection: Collection; refId: string; userId: string | null }>(),
    Unsubscribe: props<{ collection: Collection; refId: string }>(),
    'Timeline Updated': props<{ key: string; timeline: FeedTimelineItem[] }>(),
    'Timeline Failed': props<{ key: string; error: string }>(),
    'Timeline Cleared': props<{ key: string }>(),
    'Set Timeline': props<{ key: string; timeline: FeedTimelineItem[] }>(),
  },
});
