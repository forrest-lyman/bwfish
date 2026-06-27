import type { Collection } from "./page.js";

export type FeedEntryType = "question" | "tip" | "correction";

export interface FeedEntry {
  id?: string;
  type: FeedEntryType;
  text: string;
  collection: Collection;
  refId: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}
