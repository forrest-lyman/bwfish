import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import type { Port } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class PortService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'ports');

  async getAll(): Promise<Port[]> {
    const snap = await getDocs(this.col);
    return snap.docs.map(d => d.data() as Port);
  }

  async getById(id: string): Promise<Port | null> {
    const snap = await getDoc(doc(this.fs, 'ports', id));
    return snap.exists() ? (snap.data() as Port) : null;
  }

  async getByRegion(regionId: string): Promise<Port[]> {
    const q = query(this.col, where('regionId', '==', regionId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data() as Port)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }
}
