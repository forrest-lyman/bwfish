import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { FishService } from '../services/fish.service';
import { Page, type ContentPageItem } from '../components/page/page';

@Component({
  selector: 'app-fish',
  standalone: true,
  imports: [Page, Layout],
  template: `
    <app-layout>
      @if (item()) {
        <app-page [item]="item()!" />
      }
    </app-layout>
  `,
})
export class FishPage implements OnInit {
  private route = inject(ActivatedRoute);
  private fishService = inject(FishService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const fish = await this.fishService.getById(id);
    if (fish) this.item.set({ ...fish, collection: 'fish' });
  }
}
