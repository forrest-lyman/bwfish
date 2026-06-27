import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  limit,
  runTransaction,
  type QueryConstraint,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import type { FeedEntry, FeedEntryType, FeedVoteValue, Collection } from '@bwfish/core';

export interface FeedDateRange {
  from?: string;
  to?: string;
}

export interface FeedVoteResult {
  score: number;
  userVote: FeedVoteValue | null;
}

@Injectable({ providedIn: 'root' })
export class FeedService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  async push(
    type: FeedEntryType,
    text: string,
    refCollection: Collection,
    refId: string,
    payload?: unknown
  ) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to submit');

    const now = new Date().toISOString();
    const entry: Record<string, unknown> = {
      type,
      text,
      collection: refCollection,
      refId,
      createdBy: user.uid,
      createdAt: now,
      lastModified: now,
      score: 0,
    };

    if (payload !== undefined) {
      entry['payload'] = payload;
    }

    await addDoc(collection(this.fs, 'feed'), entry);
  }

  async update(entryId: string, text: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to edit');

    await updateDoc(doc(this.fs, 'feed', entryId), {
      text,
      lastModified: new Date().toISOString(),
    });
  }

  async remove(entryId: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to delete');

    await deleteDoc(doc(this.fs, 'feed', entryId));
  }

  pull(refCollection: Collection, refId: string): Promise<FeedEntry[]> {
    const q = query(
      collection(this.fs, 'feed'),
      where('collection', '==', refCollection),
      where('refId', '==', refId),
      orderBy('createdAt', 'desc')
    );

    return getDocs(q).then(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedEntry))
    );
  }

  pullByUser(userId: string, range?: FeedDateRange): Promise<FeedEntry[]> {
    const constraints: QueryConstraint[] = [where('createdBy', '==', userId)];

    if (range?.from) {
      constraints.push(where('createdAt', '>=', range.from));
    }
    if (range?.to) {
      constraints.push(where('createdAt', '<=', range.to));
    }

    constraints.push(orderBy('createdAt', 'desc'), limit(200));

    const q = query(collection(this.fs, 'feed'), ...constraints);
    return getDocs(q).then(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedEntry))
    );
  }

  async pullUserVotes(userId: string | null, entryIds: string[]): Promise<Map<string, FeedVoteValue>> {
    const votes = new Map<string, FeedVoteValue>();
    if (!userId || entryIds.length === 0) return votes;

    const snaps = await Promise.all(
      entryIds.map(entryId => getDoc(doc(this.fs, 'feed_votes', `${entryId}_${userId}`)))
    );

    for (let i = 0; i < entryIds.length; i++) {
      const snap = snaps[i];
      if (snap.exists()) {
        votes.set(entryIds[i], snap.data()['value'] as FeedVoteValue);
      }
    }

    return votes;
  }

  async vote(entryId: string, direction: 'up' | 'down'): Promise<FeedVoteResult> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to vote');

    const voteRef = doc(this.fs, 'feed_votes', `${entryId}_${user.uid}`);
    const entryRef = doc(this.fs, 'feed', entryId);
    const desired: FeedVoteValue = direction === 'up' ? 1 : -1;

    return runTransaction(this.fs, async tx => {
      const voteSnap = await tx.get(voteRef);
      const entrySnap = await tx.get(entryRef);
      if (!entrySnap.exists()) throw new Error('Entry not found');

      const currentScore = (entrySnap.data()['score'] as number | undefined) ?? 0;
      const existing = voteSnap.exists() ? (voteSnap.data()['value'] as FeedVoteValue) : null;
      let scoreDelta = 0;
      let userVote: FeedVoteValue | null = desired;

      if (existing === desired) {
        tx.delete(voteRef);
        scoreDelta = -desired;
        userVote = null;
      } else if (existing === null) {
        tx.set(voteRef, {
          entryId,
          userId: user.uid,
          value: desired,
          createdAt: new Date().toISOString(),
        });
        scoreDelta = desired;
      } else {
        tx.update(voteRef, { value: desired });
        scoreDelta = desired - existing;
      }

      const score = currentScore + scoreDelta;
      tx.update(entryRef, { score });

      return { score, userVote };
    });
  }
}
