import type { Collection, FeedEntry as FeedEntryRecord } from '@bwfish/core';
import type { FeedTimelineItem } from '../../components/feed-entry/feed-entry';
import {
  buildFeedTimeline,
  filterVisibleFeedEntries,
  type FeedEntryView,
  type FeedThread,
} from '../../components/feed-entry/feed-entry';
import type { FeedService } from '../../services/feed.service';
import type { UserService } from '../../services/user.service';
import type { FeedVoteValue } from '@bwfish/core';

export interface FeedSlice {
  collection: Collection;
  refId: string;
  timeline: FeedTimelineItem[];
  loading: boolean;
  error: string | null;
}

export interface FeedState {
  activeKey: string | null;
  feeds: Record<string, FeedSlice>;
}

export const initialFeedState: FeedState = {
  activeKey: null,
  feeds: {},
};

export function feedKey(collection: Collection, refId: string) {
  return `${collection}__${refId}`;
}

export function createFeedSlice(collection: Collection, refId: string): FeedSlice {
  return {
    collection,
    refId,
    timeline: [],
    loading: true,
    error: null,
  };
}

function initialsFrom(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function buildThreads(entries: FeedEntryView[]): FeedThread[] {
  const byId = new Map<string, FeedEntryView>();
  for (const entry of entries) {
    if (entry.entry.id) {
      byId.set(entry.entry.id, entry);
    }
  }

  const repliesByParent = new Map<string, FeedEntryView[]>();
  const roots: FeedEntryView[] = [];

  for (const entry of entries) {
    const replyTo = entry.entry.replyTo;
    if (replyTo && byId.has(replyTo)) {
      const replies = repliesByParent.get(replyTo) ?? [];
      replies.push(entry);
      repliesByParent.set(replyTo, replies);
    } else if (entry.entry.type !== 'answer' && entry.entry.type !== 'observation') {
      roots.push(entry);
    }
  }

  return roots.map(item => ({
    item,
    replies: (item.entry.id ? (repliesByParent.get(item.entry.id) ?? []) : []).sort((a, b) =>
      a.entry.createdAt.localeCompare(b.entry.createdAt)
    ),
  }));
}

export async function buildFeedTimelineFromEntries(
  entries: FeedEntryRecord[],
  userId: string | null,
  userService: UserService,
  feedService: FeedService,
): Promise<FeedTimelineItem[]> {
  const visible = filterVisibleFeedEntries(entries);
  const entryIds = visible.map(entry => entry.id).filter((id): id is string => !!id);
  const userIds = [...new Set(visible.map(entry => entry.createdBy))];

  const [users, userVotes] = await Promise.all([
    Promise.all(userIds.map(id => userService.getById(id))),
    feedService.pullUserVotes(userId, entryIds).catch(() => new Map<string, FeedVoteValue>()),
  ]);
  const userMap = new Map(userIds.map((id, index) => [id, users[index]]));

  const views = visible.map(entry => {
    const user = userMap.get(entry.createdBy);
    const displayName = user?.displayName ?? 'Angler';

    return {
      entry,
      displayName,
      photoUrl: user?.photoUrl,
      initials: initialsFrom(displayName),
      score: entry.score ?? 0,
      userVote: entry.id ? (userVotes.get(entry.id) ?? null) : null,
    };
  });

  const observations = views.filter(view => view.entry.type === 'observation');
  const threads = buildThreads(views.filter(view => view.entry.type !== 'observation'));

  return buildFeedTimeline(threads, observations);
}
