import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../../components/layout/layout';
import { Page, type ContentPageItem } from '../../components/page/page';
import { SpotService } from '../../services/spot.service';

@Component({
  selector: 'app-spot',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './spot.html',
  styleUrl: './spot.scss',
})
export class Spot implements OnInit {
  private route = inject(ActivatedRoute);
  private spotService = inject(SpotService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const spotId = this.route.snapshot.paramMap.get('spot')!;
    const spot = await this.spotService.getById(spotId);
    this.item.set(spot ? { ...spot, collection: 'spots' } : null);
  }
}
