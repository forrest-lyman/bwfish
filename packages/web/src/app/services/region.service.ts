import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, orderBy, query } from '@angular/fire/firestore';
import type { Region } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class RegionService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'regions');

  async getAll(): Promise<Region[]> {
    const snap = await getDocs(query(this.col, orderBy('displayOrder')));
    return snap.docs.map(d => d.data() as Region);
  }

  async getById(id: string): Promise<Region | null> {
    const snap = await getDoc(doc(this.fs, 'regions', id));
    return snap.exists() ? (snap.data() as Region) : null;
  }
}
