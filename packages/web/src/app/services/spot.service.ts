import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import type { Spot } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class SpotService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'spots');

  async getAll(): Promise<Spot[]> {
    const snap = await getDocs(this.col);
    return snap.docs.map(d => d.data() as Spot);
  }

  async getById(id: string): Promise<Spot | null> {
    const snap = await getDoc(doc(this.fs, 'spots', id));
    return snap.exists() ? (snap.data() as Spot) : null;
  }

  async getByPort(portId: string): Promise<Spot[]> {
    const q = query(this.col, where('portIds', 'array-contains', portId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Spot);
  }

  async getByRegion(regionId: string): Promise<Spot[]> {
    const q = query(this.col, where('regionId', '==', regionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Spot);
  }
}
