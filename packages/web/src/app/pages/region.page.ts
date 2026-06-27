import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { RegionService } from '../services/region.service';
import { Page, type ContentPageItem } from '../components/page/page';

@Component({
  selector: 'app-region',
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
export class RegionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private regionService = inject(RegionService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('region')!;
    const region = await this.regionService.getById(id);
    if (region) this.item.set({ ...region, collection: 'regions' });
  }
}
