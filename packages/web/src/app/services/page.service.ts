import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import type { Collection, Page } from '@bwfish/core';

@Injectable({ providedIn: 'root' })
export class PageService {
  private fs = inject(Firestore);

  async getPage(collection: Collection, id: string): Promise<Page | null> {
    const snap = await getDoc(doc(this.fs, 'pages', `${collection}__${id}`));
    return snap.exists() ? (snap.data() as Page) : null;
  }
}
