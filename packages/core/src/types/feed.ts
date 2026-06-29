import type { Collection } from "./page.js";

export type FeedEntryType = "question" | "tip" | "correction" | "answer";

export type FeedEntryStatus = "new" | "pending" | "answered" | "failed" | "warning" | "danger";

export type FeedVoteValue = 1 | -1;

export interface FeedVote {
  entryId: string;
  userId: string;
  value: FeedVoteValue;
  createdAt: string;
}

export interface FeedTipPayload {
  imageUrl?: string;
  date?: string;
}

export interface FeedEntry {
  id?: string;
  type: FeedEntryType;
  text: string;
  collection: Collection;
  refId: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  score?: number;
  payload?: unknown;
  status?: FeedEntryStatus;
  replyTo?: string;
  agentId?: string;
  draftPath?: string;
}
