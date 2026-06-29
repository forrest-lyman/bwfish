import { Component, effect, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { marked } from 'marked';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import type { Collection } from '@bwfish/core';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';
import { Feed } from '../feed/feed';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { RelatedContent, type RelatedSection } from '../related-content/related-content';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import {
  FishActions,
  PortActions,
  RegionActions,
  SpotActions,
  TechniqueActions,
  listLoadingKey,
  selectError,
  selectFishByIds,
  selectFishState,
  selectLoading as selectPageLoading,
  selectPortsByIds,
  selectPortsByRegion,
  selectPortsState,
  selectRegionById,
  selectRegionsState,
  selectSourceBody,
  selectSpotsByPort,
  selectSpotsState,
  selectTechniquesByFish,
  selectTechniquesState,
} from '../../store';

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
  private store = inject(Store);
  private feedService = inject(FeedService);
  private feed = viewChild<Feed>('feed');

  body = signal('');
  sourceBody = toSignal(this.store.select(selectSourceBody), { initialValue: '' });
  loading = toSignal(this.store.select(selectPageLoading), { initialValue: false });
  pageError = toSignal(this.store.select(selectError), { initialValue: null as string | null });
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

    effect(() => {
      const source = this.sourceBody();
      void this.renderBody(source);
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

  private async renderBody(source: string) {
    this.body.set(source ? await marked(this.stripLeadingH1(source)) : '');
  }

  private async load(item: ContentPageItem | null) {
    if (!item) {
      this.related.set([]);
      this.editing.set(false);
      this.editView.set('editor');
      this.editError.set(null);
      return;
    }

    this.related.set([]);
    this.editing.set(false);
    this.editView.set('editor');
    this.editError.set(null);

    await this.loadRelated(item);
  }

  private stripLeadingH1(markdown: string): string {
    return markdown.replace(/^\s*#\s+.+\n?/, '');
  }

  private async loadRelated(item: ContentPageItem) {
    const groups: RelatedSection[] = [];

    if (item.collection === 'regions') {
      this.store.dispatch(PortActions.loadByRegion({ regionId: item.id }));
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }

      await this.awaitListLoaded('ports', 'region', item.id);
      const ports = await firstValueFrom(this.store.select(selectPortsByRegion(item.id)).pipe(take(1)));

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

      if (item.fishIds?.length) {
        await this.awaitEntityLoads('fish', item.fishIds);
        const fish = await firstValueFrom(this.store.select(selectFishByIds(item.fishIds)).pipe(take(1)));
        if (fish.length) {
          groups.push({
            label: 'Fish',
            items: fish.map(entry => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              link: ['/fish', entry.id],
            })),
          });
        }
      }
    }

    if (item.collection === 'ports') {
      this.store.dispatch(SpotActions.loadByPort({ portId: item.id }));
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }

      await this.awaitListLoaded('spots', 'port', item.id);
      const spots = await firstValueFrom(this.store.select(selectSpotsByPort(item.id)).pipe(take(1)));

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

      if (item.fishIds?.length) {
        await this.awaitEntityLoads('fish', item.fishIds);
        const fish = await firstValueFrom(this.store.select(selectFishByIds(item.fishIds)).pipe(take(1)));
        if (fish.length) {
          groups.push({
            label: 'Fish',
            items: fish.map(entry => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              link: ['/fish', entry.id],
            })),
          });
        }
      }
    }

    if (item.collection === 'fish') {
      for (const regionId of item.regionIds ?? []) {
        this.store.dispatch(RegionActions.load({ id: regionId, setCurrent: false }));
      }
      this.store.dispatch(TechniqueActions.loadByFish({ fishId: item.id }));

      if (item.regionIds?.length) {
        await this.awaitEntityLoads('regions', item.regionIds);
        const regions = await Promise.all(
          item.regionIds.map(regionId =>
            firstValueFrom(this.store.select(selectRegionById(regionId)).pipe(take(1))),
          ),
        );
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
      }

      await this.awaitListLoaded('techniques', 'fish', item.id);
      const techniques = await firstValueFrom(this.store.select(selectTechniquesByFish(item.id)).pipe(take(1)));
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
      if (item.regionId) {
        this.store.dispatch(RegionActions.load({ id: item.regionId, setCurrent: false }));
      }
      for (const portId of item.portIds ?? []) {
        this.store.dispatch(PortActions.load({ id: portId, setCurrent: false }));
      }
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }

      if (item.regionId) {
        await this.awaitEntityLoads('regions', [item.regionId]);
        const region = await firstValueFrom(this.store.select(selectRegionById(item.regionId)).pipe(take(1)));
        if (region) {
          groups.push({
            label: 'Region',
            items: [{ id: region.id, title: region.title, summary: region.summary, link: ['/', region.id] }],
          });
        }
      }

      if (item.portIds?.length) {
        await this.awaitEntityLoads('ports', item.portIds);
        const ports = await firstValueFrom(this.store.select(selectPortsByIds(item.portIds)).pipe(take(1)));
        if (ports.length) {
          groups.push({
            label: 'Ports',
            items: ports.map(entry => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              link: ['/', entry.regionId, entry.id],
            })),
          });
        }
      }

      if (item.fishIds?.length) {
        await this.awaitEntityLoads('fish', item.fishIds);
        const fish = await firstValueFrom(this.store.select(selectFishByIds(item.fishIds)).pipe(take(1)));
        if (fish.length) {
          groups.push({
            label: 'Fish',
            items: fish.map(entry => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              link: ['/fish', entry.id],
            })),
          });
        }
      }
    }

    if (item.collection === 'techniques') {
      for (const regionId of item.regionIds ?? []) {
        this.store.dispatch(RegionActions.load({ id: regionId, setCurrent: false }));
      }
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }

      if (item.regionIds?.length) {
        await this.awaitEntityLoads('regions', item.regionIds);
        const regions = await Promise.all(
          item.regionIds.map(regionId =>
            firstValueFrom(this.store.select(selectRegionById(regionId)).pipe(take(1))),
          ),
        );
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
      }

      if (item.fishIds?.length) {
        await this.awaitEntityLoads('fish', item.fishIds);
        const fish = await firstValueFrom(this.store.select(selectFishByIds(item.fishIds)).pipe(take(1)));
        if (fish.length) {
          groups.push({
            label: 'Fish',
            items: fish.map(entry => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              link: ['/fish', entry.id],
            })),
          });
        }
      }
    }

    this.related.set(groups);
  }

  private awaitListLoaded(feature: 'ports' | 'spots' | 'techniques', scope: string, id: string) {
    const key = listLoadingKey(scope, id);

    if (feature === 'ports') {
      return firstValueFrom(
        this.store.select(selectPortsState).pipe(
          filter(state => state.loading[key] === false),
          take(1),
        ),
      );
    }

    if (feature === 'spots') {
      return firstValueFrom(
        this.store.select(selectSpotsState).pipe(
          filter(state => state.loading[key] === false),
          take(1),
        ),
      );
    }

    return firstValueFrom(
      this.store.select(selectTechniquesState).pipe(
        filter(state => state.loading[key] === false),
        take(1),
      ),
    );
  }

  private awaitEntityLoads(feature: 'regions' | 'ports' | 'fish', ids: string[]) {
    if (ids.length === 0) return Promise.resolve();

    if (feature === 'regions') {
      return firstValueFrom(
        this.store.select(selectRegionsState).pipe(
          filter(state => ids.every(id => !state.loading[id])),
          take(1),
        ),
      );
    }

    if (feature === 'ports') {
      return firstValueFrom(
        this.store.select(selectPortsState).pipe(
          filter(state => ids.every(id => !state.loading[id])),
          take(1),
        ),
      );
    }

    return firstValueFrom(
      this.store.select(selectFishState).pipe(
        filter(state => ids.every(id => !state.loading[id])),
        take(1),
      ),
    );
  }
}
