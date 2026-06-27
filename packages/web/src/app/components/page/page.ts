import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marked } from 'marked';
import type { Collection } from '@bwfish/core';
import { Feed } from '../feed/feed';
import { FishService } from '../../services/fish.service';
import { PageService } from '../../services/page.service';
import { PortService } from '../../services/port.service';
import { RegionService } from '../../services/region.service';
import { SpotService } from '../../services/spot.service';
import { TechniqueService } from '../../services/technique.service';

export interface ContentPageItem {
  id: string;
  title: string;
  summary: string;
  collection: Collection;
  regionId?: string;
  fishIds?: string[];
  regionIds?: string[];
  portIds?: string[];
}

interface RelatedGroup {
  label: string;
  items: { id: string; title: string; link: string[] }[];
}

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [RouterLink, Feed],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {
  item = input<ContentPageItem | null>(null);

  private pageService = inject(PageService);
  private portService = inject(PortService);
  private spotService = inject(SpotService);
  private fishService = inject(FishService);
  private techniqueService = inject(TechniqueService);
  private regionService = inject(RegionService);

  body = signal('');
  loading = signal(false);
  related = signal<RelatedGroup[]>([]);

  constructor() {
    effect(() => {
      const item = this.item();
      void this.load(item);
    });
  }

  private async load(item: ContentPageItem | null) {
    if (!item) {
      this.body.set('');
      this.related.set([]);
      this.loading.set(false);
      return;
    }

    const { id, collection } = item;
    this.body.set('');
    this.related.set([]);
    this.loading.set(true);

    const [page] = await Promise.all([
      this.pageService.getPage(collection, id),
      this.loadRelated(item),
    ]);

    this.loading.set(false);

    if (page?.body) {
      this.body.set(await marked(page.body));
    }
  }

  private async loadRelated(item: ContentPageItem) {
    const groups: RelatedGroup[] = [];

    if (item.collection === 'regions') {
      const [ports, fish] = await Promise.all([
        this.portService.getByRegion(item.id),
        Promise.all((item.fishIds ?? []).map(fishId => this.fishService.getById(fishId))),
      ]);

      if (ports.length) {
        groups.push({
          label: 'Ports',
          items: ports.map(port => ({ id: port.id, title: port.title, link: ['/', item.id, port.id] })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({ id: entry.id, title: entry.title, link: ['/fish', entry.id] })),
        });
      }
    }

    if (item.collection === 'ports') {
      const [spots, fish] = await Promise.all([
        this.spotService.getByPort(item.id),
        Promise.all((item.fishIds ?? []).map(fishId => this.fishService.getById(fishId))),
      ]);

      if (spots.length) {
        groups.push({
          label: 'Spots',
          items: spots.map(spot => ({ id: spot.id, title: spot.title, link: ['/', item.regionId ?? '', item.id, spot.id] })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({ id: entry.id, title: entry.title, link: ['/fish', entry.id] })),
        });
      }
    }

    if (item.collection === 'fish') {
      const [regions, techniques] = await Promise.all([
        Promise.all((item.regionIds ?? []).map(regionId => this.regionService.getById(regionId))),
        this.techniqueService.getByFish(item.id),
      ]);

      const validRegions = regions.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validRegions.length) {
        groups.push({
          label: 'Regions',
          items: validRegions.map(entry => ({ id: entry.id, title: entry.title, link: ['/', entry.id] })),
        });
      }

      if (techniques.length) {
        groups.push({
          label: 'Techniques',
          items: techniques.map(entry => ({ id: entry.id, title: entry.title, link: ['/techniques', entry.id] })),
        });
      }
    }

    if (item.collection === 'spots') {
      const [region, ports, fish] = await Promise.all([
        item.regionId ? this.regionService.getById(item.regionId) : Promise.resolve(null),
        Promise.all((item.portIds ?? []).map(portId => this.portService.getById(portId))),
        Promise.all((item.fishIds ?? []).map(fishId => this.fishService.getById(fishId))),
      ]);

      if (region) {
        groups.push({
          label: 'Region',
          items: [{ id: region.id, title: region.title, link: ['/', region.id] }],
        });
      }

      const validPorts = ports.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validPorts.length) {
        groups.push({
          label: 'Ports',
          items: validPorts.map(entry => ({ id: entry.id, title: entry.title, link: ['/', entry.regionId, entry.id] })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({ id: entry.id, title: entry.title, link: ['/fish', entry.id] })),
        });
      }
    }

    if (item.collection === 'techniques') {
      const [regions, fish] = await Promise.all([
        Promise.all((item.regionIds ?? []).map(regionId => this.regionService.getById(regionId))),
        Promise.all((item.fishIds ?? []).map(fishId => this.fishService.getById(fishId))),
      ]);

      const validRegions = regions.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validRegions.length) {
        groups.push({
          label: 'Regions',
          items: validRegions.map(entry => ({ id: entry.id, title: entry.title, link: ['/', entry.id] })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({ id: entry.id, title: entry.title, link: ['/fish', entry.id] })),
        });
      }
    }

    this.related.set(groups);
  }

}
