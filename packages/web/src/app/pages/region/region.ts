import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../../components/layout/layout';
import { Page, type ContentPageItem } from '../../components/page/page';
import { RegionService } from '../../services/region.service';

@Component({
  selector: 'app-region',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './region.html',
  styleUrl: './region.scss',
})
export class Region implements OnInit {
  private route = inject(ActivatedRoute);
  private regionService = inject(RegionService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const regionId = this.route.snapshot.paramMap.get('region')!;
    const region = await this.regionService.getById(regionId);
    this.item.set(region ? { ...region, collection: 'regions' } : null);
  }
}
