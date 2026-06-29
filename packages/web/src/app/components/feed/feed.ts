import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component, computed, effect, ElementRef, HostListener, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideMessageSquareQuote, LucideSearch, LucideSendHorizontal } from '@lucide/angular';
import { Store } from '@ngrx/store';
import type { Collection } from '@bwfish/core';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import { FeedActions, feedKey, selectActiveFeedError, selectActiveTimeline } from '../../store';
import { FeedEntry, extractCorrectionPayload, feedTimelineMatchesSearch, feedTimelineTrack, type FeedEntryView, type FeedTimelineItem } from '../feed-entry/feed-entry';
import { FeedObservationActivity } from '../feed-observation-activity/feed-observation-activity';
import { Dialog } from '../dialog/dialog';
import { MarkdownDiff } from '../markdown-diff/markdown-diff';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [ReactiveFormsModule, LucideMessageSquareQuote, LucideSearch, LucideSendHorizontal, FeedEntry, FeedObservationActivity, Dialog, MarkdownDiff],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  title = input<string>('');
  collection = input<Collection | null>(null);
  refId = input<string | null>(null);
  layout = input<'inline' | 'sidebar'>('inline');
  observationsEnabled = input(true);

  auth = inject(AuthService);
  private store = inject(Store);
  private feedService = inject(FeedService);

  feedTimeline = toSignal(this.store.select(selectActiveTimeline), { initialValue: [] as FeedTimelineItem[] });
  storeError = toSignal(this.store.select(selectActiveFeedError), { initialValue: null as string | null });
  searchQuery = signal('');
  filteredFeedTimeline = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.feedTimeline();

    return this.feedTimeline().filter(item => feedTimelineMatchesSearch(item, query));
  });
  submitting = signal(false);
  votingEntryId = signal<string | null>(null);
  managingEntryId = signal<string | null>(null);
  error = computed(() => this.localError() ?? this.storeError());
  private localError = signal<string | null>(null);
  reviewOpen = signal(false);
  reviewOriginal = signal('');
  reviewModified = signal('');
  observationOpen = signal(false);
  observationSubmitting = signal(false);
  observationImageFile = signal<File | null>(null);
  observationImagePreview = signal<string | null>(null);
  feedForm = new FormGroup({
    text: new FormControl('', []),
  });
  observationForm = new FormGroup({
    text: new FormControl(''),
    date: new FormControl(this.todayIso(), { nonNullable: true }),
  });
  private textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');
  private observationTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('observationTextInput');
  private observationFileInput = viewChild<ElementRef<HTMLInputElement>>('observationFileInput');

  feedTimelineTrack = feedTimelineTrack;

  constructor() {
    effect(onCleanup => {
      const collection = this.collection();
      const refId = this.refId();
      if (!this.auth.ready() || !collection || !refId) return;

      const userId = this.auth.user()?.uid ?? null;
      this.localError.set(null);
      this.store.dispatch(FeedActions.subscribe({ collection, refId, userId }));

      onCleanup(() => {
        this.store.dispatch(FeedActions.unsubscribe({ collection, refId }));
      });
    });

    effect(() => {
      if (!this.observationOpen()) return;
      queueMicrotask(() => this.observationTextInput()?.nativeElement.focus());
    });
  }

  prompt() {
    return `Ask anything about ${this.title()}`;
  }

  canSubmitQuestion() {
    const text = this.feedForm.value.text?.trim() ?? '';
    return text.length >= 3 && !this.submitting();
  }

  @HostListener('document:paste', ['$event'])
  onDocumentPaste(event: ClipboardEvent) {
    if (!this.canAcceptObservationImage()) return;

    const target = event.target;
    if (target instanceof Element && target.closest('app-markdown-editor, .edit-message')) {
      return;
    }

    const file = this.imageFromClipboard(event);
    if (!file) return;

    event.preventDefault();
    this.handleObservationImage(file);
  }

  @HostListener('document:dragover', ['$event'])
  onDocumentDragOver(event: DragEvent) {
    if (!this.canAcceptObservationImage() || !this.isImageDrag(event)) return;

    event.preventDefault();
  }

  @HostListener('document:drop', ['$event'])
  onDocumentDrop(event: DragEvent) {
    if (!this.canAcceptObservationImage()) return;

    const file = this.imageFromDataTransfer(event);
    if (!file) return;

    event.preventDefault();
    this.handleObservationImage(file);
  }

  onObservationKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    void this.submitObservation();
  }

  private canAcceptObservationImage() {
    return this.observationsEnabled() && !!this.collection() && !!this.refId();
  }

  private handleObservationImage(file: File) {
    if (!this.auth.user()) {
      this.localError.set('Must be signed in to add an observation');
      return;
    }

    if (this.observationOpen()) {
      this.setObservationImage(file);
      return;
    }

    this.openObservationDialog(file);
  }

  openObservationDialog(imageFile?: File) {
    if (!this.auth.user()) {
      this.localError.set('Must be signed in to add an observation');
      return;
    }

    this.observationForm.reset({ text: '', date: this.todayIso() });
    this.clearObservationImage();
    if (imageFile) {
      this.setObservationImage(imageFile);
    }
    this.observationOpen.set(true);
  }

  closeObservationDialog() {
    this.observationOpen.set(false);
    this.observationSubmitting.set(false);
    this.observationForm.reset({ text: '', date: this.todayIso() });
    this.clearObservationImage();
  }

  onObservationImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    this.setObservationImage(file);
    input.value = '';
  }

  removeObservationImage() {
    this.clearObservationImage();
  }

  canSubmitObservation() {
    const text = this.observationForm.value.text?.trim() ?? '';
    return (text.length > 0 || !!this.observationImageFile()) && !this.observationSubmitting();
  }

  async submitObservation() {
    const collection = this.collection();
    const refId = this.refId();
    if (!collection || !refId || !this.canSubmitObservation()) return;

    const text = this.observationForm.value.text?.trim() ?? '';
    const imageFile = this.observationImageFile();
    const date = this.observationForm.value.date?.trim() ?? '';

    this.closeObservationDialog();
    this.observationSubmitting.set(true);
    this.localError.set(null);

    try {
      const payload: { imageUrl?: string; date?: string } = {};
      if (imageFile) {
        payload.imageUrl = await this.feedService.uploadObservationImage(imageFile);
      }
      if (date) {
        payload.date = date;
      }
      await this.feedService.push(
        'observation',
        text,
        collection,
        refId,
        Object.keys(payload).length ? payload : undefined
      );
    } catch (err: unknown) {
      this.localError.set(err instanceof Error ? err.message : 'Observation submit failed');
    } finally {
      this.observationSubmitting.set(false);
    }
  }

  private todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  private setObservationImage(file: File) {
    this.clearObservationImage();
    this.observationImageFile.set(file);
    this.observationImagePreview.set(URL.createObjectURL(file));
  }

  private clearObservationImage() {
    const preview = this.observationImagePreview();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    this.observationImageFile.set(null);
    this.observationImagePreview.set(null);
  }

  private imageFromClipboard(event: ClipboardEvent): File | null {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }

    return null;
  }

  private imageFromDataTransfer(event: DragEvent): File | null {
    const files = event.dataTransfer?.files;
    if (files?.length) {
      const file = files[0];
      if (file.type.startsWith('image/')) return file;
    }

    const items = event.dataTransfer?.items;
    if (!items) return null;

    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }

    return null;
  }

  private isImageDrag(event: DragEvent) {
    const items = event.dataTransfer?.items;
    if (!items) return false;

    return [...items].some(item => item.kind === 'file' && item.type.startsWith('image/'));
  }

  resizeTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  async submit() {
    const collection = this.collection();
    const refId = this.refId();
    if (!collection || !refId || !this.canSubmitQuestion() || this.submitting()) return;

    const text = this.feedForm.value.text!.trim();
    this.submitting.set(true);
    this.localError.set(null);

    try {
      await this.feedService.push('question', text, collection, refId);
      this.feedForm.reset();
    } catch (err: any) {
      this.localError.set(err?.message ?? 'Question submit failed');
    } finally {
      this.submitting.set(false);
      const textarea = this.textInput()?.nativeElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }

  async vote(item: FeedEntryView, direction: 'up' | 'down') {
    const entryId = item.entry.id;
    if (!entryId || this.votingEntryId() || this.managingEntryId()) return;

    if (!this.auth.user()) {
      this.localError.set('Must be signed in to vote');
      return;
    }

    this.votingEntryId.set(entryId);
    this.localError.set(null);

    try {
      const result = await this.feedService.vote(entryId, direction);
      this.updateEntry(entryId, entry => ({
        ...entry,
        score: result.score,
        userVote: result.userVote,
      }));
    } catch (err: unknown) {
      this.localError.set(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      this.votingEntryId.set(null);
    }
  }

  async editEntry(item: FeedEntryView, text: string) {
    const entryId = item.entry.id;
    if (!entryId || this.managingEntryId()) return;

    this.managingEntryId.set(entryId);
    this.localError.set(null);

    try {
      await this.feedService.update(entryId, text);
      this.updateEntry(entryId, entry => ({
        ...entry,
        entry: {
          ...entry.entry,
          text,
          lastModified: new Date().toISOString(),
        },
      }));
    } catch (err: unknown) {
      this.localError.set(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      this.managingEntryId.set(null);
    }
  }

  async deleteEntry(item: FeedEntryView) {
    const entryId = item.entry.id;
    if (!entryId || this.managingEntryId()) return;

    if (!confirm('Delete this post?')) return;

    this.managingEntryId.set(entryId);
    this.localError.set(null);

    try {
      await this.feedService.remove(entryId);
      this.patchTimeline(timeline =>
        timeline.flatMap((item): FeedTimelineItem[] => {
          if (item.kind === 'observationActivity') {
            return [item];
          }

          if (item.thread.item.entry.id === entryId) {
            return [];
          }

          return [
            {
              kind: 'thread',
              thread: {
                ...item.thread,
                replies: item.thread.replies.filter(reply => reply.entry.id !== entryId),
              },
            },
          ];
        })
      );
    } catch (err: unknown) {
      this.localError.set(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      this.managingEntryId.set(null);
    }
  }

  /** Kept for callers; live subscription refreshes the feed automatically. */
  async reload() {}

  openReview(item: FeedEntryView) {
    const payload = extractCorrectionPayload(item.entry.payload);
    if (!payload) return;

    this.reviewOriginal.set(payload.original);
    this.reviewModified.set(payload.text);
    this.reviewOpen.set(true);
  }

  closeReview() {
    this.reviewOpen.set(false);
  }

  private patchTimeline(updater: (timeline: FeedTimelineItem[]) => FeedTimelineItem[]) {
    const collection = this.collection();
    const refId = this.refId();
    if (!collection || !refId) return;

    this.store.dispatch(
      FeedActions.setTimeline({
        key: feedKey(collection, refId),
        timeline: updater(this.feedTimeline()),
      })
    );
  }

  private updateEntry(entryId: string, updater: (entry: FeedEntryView) => FeedEntryView) {
    this.patchTimeline(timeline =>
      timeline.map(item => {
        if (item.kind === 'observationActivity') {
          return item;
        }

        return {
          kind: 'thread' as const,
          thread: {
            item:
              item.thread.item.entry.id === entryId
                ? updater(item.thread.item)
                : item.thread.item,
            replies: item.thread.replies.map(reply =>
              reply.entry.id === entryId ? updater(reply) : reply
            ),
          },
        };
      })
    );
  }
}
