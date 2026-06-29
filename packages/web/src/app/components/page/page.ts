import { Component, computed, DestroyRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { marked } from 'marked';
import { Store } from '@ngrx/store';
import { firstValueFrom, of } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import type { Collection } from '@bwfish/core';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';
import { Feed } from '../feed/feed';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { RelatedContent, type RelatedSection } from '../related-content/related-content';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import { LoadingService } from '../../services/loading.service';
import {
  FishActions,
  PortActions,
  RegionActions,
  SpotActions,
  TechniqueActions,
  entitiesLoaded,
  entitiesNotLoading,
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
  selectTechniquesByFish,
} from '../../store';

export interface PageChildLink {
  id: string;
  title: string;
  link: string[];
}

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
  imports: [Breadcrumbs, Feed, MarkdownEditor, ReactiveFormsModule, RelatedContent, RouterLink],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {
  item = input<ContentPageItem | null>(null);

  auth = inject(AuthService);
  private store = inject(Store);
  private feedService = inject(FeedService);
  private loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);
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
  primaryChildren = toSignal(
    toObservable(this.item).pipe(
      switchMap(item => {
        if (!item) return of([] as PageChildLink[]);

        if (item.collection === 'regions') {
          return this.store.select(selectPortsByRegion(item.id)).pipe(
            map(ports =>
              ports.map(port => ({
                id: port.id,
                title: port.title,
                link: ['/', item.id, port.id],
              })),
            ),
          );
        }

        if (item.collection === 'ports') {
          return this.store.select(selectSpotsByPort(item.id)).pipe(
            map(spots =>
              spots.map(spot => ({
                id: spot.id,
                title: spot.title,
                link: ['/', item.regionId ?? '', item.id, spot.id],
              })),
            ),
          );
        }

        if (item.collection === 'fish') {
          return this.store.select(selectTechniquesByFish(item.id)).pipe(
            map(techniques =>
              techniques.map(technique => ({
                id: technique.id,
                title: technique.title,
                link: ['/techniques', technique.id],
              })),
            ),
          );
        }

        return of([] as PageChildLink[]);
      }),
    ),
    { initialValue: [] as PageChildLink[] },
  );
  fishLabels = toSignal(
    toObservable(this.item).pipe(
      switchMap(item => {
        if (!item?.fishIds?.length) return of([] as PageChildLink[]);

        return this.store.select(selectFishByIds(item.fishIds)).pipe(
          map(fish =>
            fish.map(entry => ({
              id: entry.id,
              title: entry.title,
              link: ['/fish', entry.id],
            })),
          ),
        );
      }),
    ),
    { initialValue: [] as PageChildLink[] },
  );
  primaryChildrenLabel = computed(() => {
    const item = this.item();
    if (!item) return '';

    switch (item.collection) {
      case 'regions':
        return 'Ports';
      case 'ports':
        return 'Spots';
      case 'fish':
        return 'Techniques';
      default:
        return '';
    }
  });
  related = signal<RelatedSection[]>([]);
  editForm = new FormControl('', { nonNullable: true });
  submitExplanationForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });
  private loadSerial = 0;

  constructor() {
    effect(() => {
      const item = this.item();
      if (item) {
        this.dispatchRelatedLoads(item);
      }
      void this.loadRelated(item);
    });

    effect(() => {
      const source = this.sourceBody();
      void this.renderBody(source);
    });

    effect(() => {
      const item = this.item();
      const pageLoading = this.loading();
      const editing = this.editing();
      const isLoading = !editing && (!item || pageLoading);

      if (isLoading) {
        this.loadingService.show('Loading page…');
      } else {
        this.loadingService.hide();
      }
    });

    this.destroyRef.onDestroy(() => this.loadingService.hide());
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

  private async loadRelated(item: ContentPageItem | null) {
    const serial = ++this.loadSerial;

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

    const related = await this.loadSecondaryRelated(item);
    if (serial !== this.loadSerial) return;

    this.related.set(related);
  }

  private dispatchRelatedLoads(item: ContentPageItem) {
    if (item.collection === 'regions') {
      this.store.dispatch(PortActions.loadByRegion({ regionId: item.id }));
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }
      return;
    }

    if (item.collection === 'ports') {
      this.store.dispatch(SpotActions.loadByPort({ portId: item.id }));
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }
      return;
    }

    if (item.collection === 'fish') {
      for (const regionId of item.regionIds ?? []) {
        this.store.dispatch(RegionActions.load({ id: regionId, setCurrent: false }));
      }
      this.store.dispatch(TechniqueActions.loadByFish({ fishId: item.id }));
      return;
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
      return;
    }

    if (item.collection === 'techniques') {
      for (const regionId of item.regionIds ?? []) {
        this.store.dispatch(RegionActions.load({ id: regionId, setCurrent: false }));
      }
      if (item.fishIds?.length) {
        this.store.dispatch(FishActions.loadMany({ ids: item.fishIds }));
      }
    }
  }

  private stripLeadingH1(markdown: string): string {
    return markdown.replace(/^\s*#\s+.+\n?/, '');
  }

  private async loadSecondaryRelated(item: ContentPageItem): Promise<RelatedSection[]> {
    const related: RelatedSection[] = [];

    if (item.collection === 'fish') {
      if (item.regionIds?.length) {
        await this.awaitEntityLoads('regions', item.regionIds);
        const regions = await Promise.all(
          item.regionIds.map(regionId =>
            firstValueFrom(this.store.select(selectRegionById(regionId)).pipe(take(1))),
          ),
        );
        const validRegions = regions.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        if (validRegions.length) {
          related.push({
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
    }

    if (item.collection === 'spots') {
      if (item.regionId) {
        await this.awaitEntityLoads('regions', [item.regionId]);
        const region = await firstValueFrom(this.store.select(selectRegionById(item.regionId)).pipe(take(1)));
        if (region) {
          related.push({
            label: 'Region',
            items: [{ id: region.id, title: region.title, summary: region.summary, link: ['/', region.id] }],
          });
        }
      }

      if (item.portIds?.length) {
        await this.awaitEntityLoads('ports', item.portIds);
        const ports = await firstValueFrom(this.store.select(selectPortsByIds(item.portIds)).pipe(take(1)));
        if (ports.length) {
          related.push({
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
    }

    if (item.collection === 'techniques') {
      if (item.regionIds?.length) {
        await this.awaitEntityLoads('regions', item.regionIds);
        const regions = await Promise.all(
          item.regionIds.map(regionId =>
            firstValueFrom(this.store.select(selectRegionById(regionId)).pipe(take(1))),
          ),
        );
        const validRegions = regions.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        if (validRegions.length) {
          related.push({
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
    }

    return related;
  }

  private awaitEntityLoads(feature: 'regions' | 'ports' | 'fish', ids: string[]) {
    if (ids.length === 0) return Promise.resolve();

    if (feature === 'regions') {
      return firstValueFrom(
        this.store.select(selectRegionsState).pipe(
          filter(
            state =>
              entitiesLoaded(ids, state.entities, state.loading) && entitiesNotLoading(ids, state.loading),
          ),
          take(1),
        ),
      );
    }

    if (feature === 'ports') {
      return firstValueFrom(
        this.store.select(selectPortsState).pipe(
          filter(
            state =>
              entitiesLoaded(ids, state.entities, state.loading) && entitiesNotLoading(ids, state.loading),
          ),
          take(1),
        ),
      );
    }

    return firstValueFrom(
      this.store.select(selectFishState).pipe(
        filter(
          state => entitiesLoaded(ids, state.entities, state.loading) && entitiesNotLoading(ids, state.loading),
        ),
        take(1),
      ),
    );
  }
}
