import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import type { FeedEntry, FeedEntryType, Collection } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  async push(type: FeedEntryType, text: string, refCollection: Collection, refId: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to submit');

    const now = new Date().toISOString();
    await addDoc(collection(this.fs, 'feed'), {
      type,
      text,
      collection: refCollection,
      refId,
      createdBy: user.uid,
      createdAt: now,
      lastModified: now,
    });
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
}

