import { Component, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { marked } from 'marked';
import type { Collection } from '@bwfish/core';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';
import { Feed } from '../feed/feed';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { RelatedContent, type RelatedSection } from '../related-content/related-content';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
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

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [Breadcrumbs, Feed, MarkdownEditor, ReactiveFormsModule, RelatedContent],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {
  item = input<ContentPageItem | null>(null);

  auth = inject(AuthService);
  private feedService = inject(FeedService);
  private pageService = inject(PageService);
  private feed = viewChild<Feed>('feed');
  private portService = inject(PortService);
  private spotService = inject(SpotService);
  private fishService = inject(FishService);
  private techniqueService = inject(TechniqueService);
  private regionService = inject(RegionService);

  body = signal('');
  sourceBody = signal('');
  loading = signal(false);
  editing = signal(false);
  editView = signal<'editor' | 'preview'>('editor');
  previewHtml = signal('');
  submitting = signal(false);
  editError = signal<string | null>(null);
  related = signal<RelatedSection[]>([]);
  editForm = new FormControl('', { nonNullable: true });
  submitExplanationForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  constructor() {
    effect(() => {
      const item = this.item();
      void this.load(item);
    });
  }

  startEdit() {
    this.editError.set(null);
    this.editView.set('editor');
    this.previewHtml.set('');
    this.submitExplanationForm.reset();
    this.editForm.setValue(this.sourceBody());
    this.editing.set(true);
  }

  cancelEdit() {
    this.editError.set(null);
    this.editView.set('editor');
    this.previewHtml.set('');
    this.submitExplanationForm.reset();
    this.editing.set(false);
  }

  setEditView(view: 'editor' | 'preview') {
    this.editView.set(view);
    if (view === 'preview') {
      void this.updatePreview();
    }
  }

  async confirmSubmit() {
    const item = this.item();
    if (!item || this.submitting() || this.submitExplanationForm.invalid) return;

    this.submitting.set(true);
    this.editError.set(null);

    try {
      const source = this.editForm.value;
      const explanation = this.submitExplanationForm.value.trim();
      await this.feedService.push('correction', explanation, item.collection, item.id, {
        original: this.sourceBody(),
        text: source,
      });
      this.editing.set(false);
      this.editView.set('editor');
      this.previewHtml.set('');
      this.submitExplanationForm.reset();
      await this.feed()?.reload();
    } catch (err: unknown) {
      this.editError.set(err instanceof Error ? err.message : 'Failed to submit changes');
    } finally {
      this.submitting.set(false);
    }
  }

  private async updatePreview() {
    const source = this.editForm.value;
    this.previewHtml.set(source ? await marked(this.stripLeadingH1(source)) : '');
  }

  private async load(item: ContentPageItem | null) {
    if (!item) {
      this.body.set('');
      this.sourceBody.set('');
      this.related.set([]);
      this.loading.set(false);
      this.editing.set(false);
      this.editView.set('editor');
      this.editError.set(null);
      return;
    }

    const { id, collection } = item;
    this.body.set('');
    this.sourceBody.set('');
    this.related.set([]);
    this.loading.set(true);
    this.editing.set(false);
    this.editView.set('editor');
    this.editError.set(null);

    const [page] = await Promise.all([
      this.pageService.getPage(collection, id),
      this.loadRelated(item),
    ]);

    this.loading.set(false);

    const source = page?.body ?? '';
    this.sourceBody.set(source);
    this.body.set(source ? await marked(this.stripLeadingH1(source)) : '');
  }

  private stripLeadingH1(markdown: string): string {
    return markdown.replace(/^\s*#\s+.+\n?/, '');
  }

  private async loadRelated(item: ContentPageItem) {
    const groups: RelatedSection[] = [];

    if (item.collection === 'regions') {
      const [ports, fish] = await Promise.all([
        this.portService.getByRegion(item.id),
        Promise.all((item.fishIds ?? []).map(fishId => this.fishService.getById(fishId))),
      ]);

      if (ports.length) {
        groups.push({
          label: 'Ports',
          items: ports.map(port => ({
            id: port.id,
            title: port.title,
            summary: port.summary,
            link: ['/', item.id, port.id],
          })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/fish', entry.id],
          })),
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
          items: spots.map(spot => ({
            id: spot.id,
            title: spot.title,
            summary: spot.summary,
            link: ['/', item.regionId ?? '', item.id, spot.id],
          })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/fish', entry.id],
          })),
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
          items: validRegions.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/', entry.id],
          })),
        });
      }

      if (techniques.length) {
        groups.push({
          label: 'Techniques',
          items: techniques.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/techniques', entry.id],
          })),
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
          items: [{ id: region.id, title: region.title, summary: region.summary, link: ['/', region.id] }],
        });
      }

      const validPorts = ports.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validPorts.length) {
        groups.push({
          label: 'Ports',
          items: validPorts.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/', entry.regionId, entry.id],
          })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/fish', entry.id],
          })),
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
          items: validRegions.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/', entry.id],
          })),
        });
      }

      const validFish = fish.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (validFish.length) {
        groups.push({
          label: 'Fish',
          items: validFish.map(entry => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            link: ['/fish', entry.id],
          })),
        });
      }
    }

    this.related.set(groups);
  }
}
