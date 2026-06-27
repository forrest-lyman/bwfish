import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../../components/layout/layout';
import { Page, type ContentPageItem } from '../../components/page/page';
import { FishService } from '../../services/fish.service';

@Component({
  selector: 'app-fish',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './fish.html',
  styleUrl: './fish.scss',
})
export class Fish implements OnInit {
  private route = inject(ActivatedRoute);
  private fishService = inject(FishService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const fish = await this.fishService.getById(id);
    this.item.set(fish ? { ...fish, collection: 'fish' } : null);
  }
}
