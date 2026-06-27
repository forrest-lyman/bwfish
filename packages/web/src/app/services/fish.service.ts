import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import type { Fish } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class FishService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'fish');

  async getAll(): Promise<Fish[]> {
    const snap = await getDocs(this.col);
    return snap.docs.map(d => d.data() as Fish);
  }

  async getById(id: string): Promise<Fish | null> {
    const snap = await getDoc(doc(this.fs, 'fish', id));
    return snap.exists() ? (snap.data() as Fish) : null;
  }

  async getByRegion(regionId: string): Promise<Fish[]> {
    const q = query(this.col, where('regionIds', 'array-contains', regionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Fish);
  }
}
