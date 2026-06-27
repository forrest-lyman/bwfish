import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import type { Technique } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class TechniqueService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'techniques');

  async getAll(): Promise<Technique[]> {
    const snap = await getDocs(this.col);
    return snap.docs.map(d => d.data() as Technique);
  }

  async getById(id: string): Promise<Technique | null> {
    const snap = await getDoc(doc(this.fs, 'techniques', id));
    return snap.exists() ? (snap.data() as Technique) : null;
  }

  async getByFish(fishId: string): Promise<Technique[]> {
    const q = query(this.col, where('fishIds', 'array-contains', fishId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Technique);
  }
}
