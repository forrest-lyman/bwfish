import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Collection, FeedEntry } from '@bwfish/core';
import { Layout } from '../../components/layout/layout';
import { AuthService } from '../../services/auth.service';
import { FeedDateRange, FeedService } from '../../services/feed.service';
import { FishService } from '../../services/fish.service';
import { PortService } from '../../services/port.service';
import { RegionService } from '../../services/region.service';
import { SpotService } from '../../services/spot.service';
import { TechniqueService } from '../../services/technique.service';

type DateFilter = 'all' | '7d' | '30d' | '90d' | 'custom';

interface ActivityItem {
  entry: FeedEntry;
  contextLabel: string;
  link: string[] | null;
}

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [Layout, RouterLink],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity {
  auth = inject(AuthService);
  private feedService = inject(FeedService);
  private regionService = inject(RegionService);
  private portService = inject(PortService);
  private spotService = inject(SpotService);
  private fishService = inject(FishService);
  private techniqueService = inject(TechniqueService);

  dateFilter = signal<DateFilter>('all');
  customFrom = signal('');
  customTo = signal('');
  items = signal<ActivityItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      this.dateFilter();
      this.customFrom();
      this.customTo();

      if (!user) {
        this.items.set([]);
        return;
      }

      void this.loadEntries(user.uid);
    });
  }

  setDateFilter(filter: DateFilter) {
    this.dateFilter.set(filter);
  }

  onCustomFromChange(event: Event) {
    this.customFrom.set((event.target as HTMLInputElement).value);
  }

  onCustomToChange(event: Event) {
    this.customTo.set((event.target as HTMLInputElement).value);
  }

  typeLabel(type: FeedEntry['type']) {
    switch (type) {
      case 'question':
        return 'Question';
      case 'tip':
        return 'Tip';
      case 'correction':
        return 'Correction';
      case 'answer':
        return 'Answer';
    }
  }

  formatDate(iso: string) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  private async loadEntries(userId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const entries = await this.feedService.pullByUser(userId, this.buildDateRange());
      const items = await Promise.all(entries.map((entry) => this.toActivityItem(entry)));
      this.items.set(items);
    } catch (err: unknown) {
      this.items.set([]);
      this.error.set(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      this.loading.set(false);
    }
  }

  private buildDateRange(): FeedDateRange | undefined {
    const filter = this.dateFilter();
    const now = new Date();

    if (filter === 'all') return undefined;

    if (filter === 'custom') {
      const from = this.customFrom();
      const to = this.customTo();
      if (!from && !to) return undefined;

      return {
        ...(from ? { from: this.startOfDay(from) } : {}),
        ...(to ? { to: this.endOfDay(to) } : {}),
      };
    }

    const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString() };
  }

  private startOfDay(dateValue: string) {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toISOString();
  }

  private endOfDay(dateValue: string) {
    const date = new Date(`${dateValue}T23:59:59.999`);
    return date.toISOString();
  }

  private async toActivityItem(entry: FeedEntry): Promise<ActivityItem> {
    const context = await this.resolveContext(entry.collection, entry.refId);
    return {
      entry,
      contextLabel: context.label,
      link: context.link,
    };
  }

  private async resolveContext(
    collection: Collection,
    refId: string
  ): Promise<{ label: string; link: string[] | null }> {
    switch (collection) {
      case 'regions': {
        const region = await this.regionService.getById(refId);
        return {
          label: region?.title ?? refId,
          link: ['/', refId],
        };
      }
      case 'ports': {
        const port = await this.portService.getById(refId);
        return port
          ? { label: port.title, link: ['/', port.regionId, port.id] }
          : { label: refId, link: null };
      }
      case 'spots': {
        const spot = await this.spotService.getById(refId);
        if (!spot) return { label: refId, link: null };
        const portId = spot.portIds[0];
        return {
          label: spot.title,
          link: portId ? ['/', spot.regionId, portId, spot.id] : null,
        };
      }
      case 'fish': {
        const fish = await this.fishService.getById(refId);
        return {
          label: fish?.title ?? refId,
          link: ['/fish', refId],
        };
      }
      case 'techniques': {
        const technique = await this.techniqueService.getById(refId);
        return {
          label: technique?.title ?? refId,
          link: ['/techniques', refId],
        };
      }
    }
  }
}
