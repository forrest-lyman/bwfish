import type { Collection } from "./page.js";

export type FeedEntryType = "question" | "observation" | "correction" | "answer";

export type FeedEntryStatus = "new" | "pending" | "answered" | "failed" | "warning" | "danger";

export type FeedVoteValue = 1 | -1;

export interface FeedVote {
  entryId: string;
  userId: string;
  value: FeedVoteValue;
  createdAt: string;
}

export interface FeedObservationPayload {
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

/** Normalize legacy Firestore feed entries that still use type `tip`. */
export function normalizeFeedEntry(entry: unknown): FeedEntry {
  const raw = entry as Omit<FeedEntry, "type"> & { type: FeedEntryType | "tip" };

  if (raw.type === "tip") {
    return { ...raw, type: "observation" };
  }

  return raw as FeedEntry;
}
