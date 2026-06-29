import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component, computed, effect, ElementRef, HostListener, inject, input, signal, viewChild } from '@angular/core';
import { LucideMessageSquareQuote, LucideSearch, LucideSendHorizontal } from '@lucide/angular';
import type { Collection, FeedEntry as FeedEntryRecord } from '@bwfish/core';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import { UserService } from '../../services/user.service';
import { FeedEntry, extractCorrectionPayload, filterVisibleFeedEntries, buildFeedTimeline, feedTimelineMatchesSearch, feedTimelineTrack, type FeedEntryView, type FeedThread, type FeedTimelineItem } from '../feed-entry/feed-entry';
import { FeedTipActivity } from '../feed-tip-activity/feed-tip-activity';
import { Dialog } from '../dialog/dialog';
import { MarkdownDiff } from '../markdown-diff/markdown-diff';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [ReactiveFormsModule, LucideMessageSquareQuote, LucideSearch, LucideSendHorizontal, FeedEntry, FeedTipActivity, Dialog, MarkdownDiff],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  title = input<string>('');
  collection = input<Collection | null>(null);
  refId = input<string | null>(null);
  layout = input<'inline' | 'sidebar'>('inline');
  tipsEnabled = input(true);

  auth = inject(AuthService);
  private feedService = inject(FeedService);
  private userService = inject(UserService);

  feedTimeline = signal<FeedTimelineItem[]>([]);
  searchQuery = signal('');
  filteredFeedTimeline = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.feedTimeline();

    return this.feedTimeline().filter(item => feedTimelineMatchesSearch(item, query));
  });
  submitting = signal(false);
  votingEntryId = signal<string | null>(null);
  managingEntryId = signal<string | null>(null);
  error = signal<string | null>(null);
  reviewOpen = signal(false);
  reviewOriginal = signal('');
  reviewModified = signal('');
  tipOpen = signal(false);
  tipSubmitting = signal(false);
  tipImageFile = signal<File | null>(null);
  tipImagePreview = signal<string | null>(null);
  feedForm = new FormGroup({
    text: new FormControl('', []),
  });
  tipForm = new FormGroup({
    text: new FormControl(''),
    date: new FormControl(this.todayIso(), { nonNullable: true }),
  });
  private textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');
  private tipTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('tipTextInput');
  private tipFileInput = viewChild<ElementRef<HTMLInputElement>>('tipFileInput');

  feedTimelineTrack = feedTimelineTrack;

  constructor() {
    effect(onCleanup => {
      const collection = this.collection();
      const refId = this.refId();
      if (!this.auth.ready()) return;
      const userId = this.auth.user()?.uid ?? null;

      if (!collection || !refId) {
        this.feedTimeline.set([]);
        return;
      }

      this.error.set(null);

      const sub = this.feedService.subscribe(collection, refId).subscribe({
        next: entries => void this.applyEntries(entries, userId),
        error: err => {
          this.feedTimeline.set([]);
          this.error.set(err instanceof Error ? err.message : 'Failed to load questions');
        },
      });

      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      if (!this.tipOpen()) return;
      queueMicrotask(() => this.tipTextInput()?.nativeElement.focus());
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
    if (!this.canAcceptTipImage()) return;

    const target = event.target;
    if (target instanceof Element && target.closest('app-markdown-editor, .edit-message')) {
      return;
    }

    const file = this.imageFromClipboard(event);
    if (!file) return;

    event.preventDefault();
    this.handleTipImage(file);
  }

  @HostListener('document:dragover', ['$event'])
  onDocumentDragOver(event: DragEvent) {
    if (!this.canAcceptTipImage() || !this.isImageDrag(event)) return;

    event.preventDefault();
  }

  @HostListener('document:drop', ['$event'])
  onDocumentDrop(event: DragEvent) {
    if (!this.canAcceptTipImage()) return;

    const file = this.imageFromDataTransfer(event);
    if (!file) return;

    event.preventDefault();
    this.handleTipImage(file);
  }

  onTipKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    void this.submitTip();
  }

  private canAcceptTipImage() {
    return this.tipsEnabled() && !!this.collection() && !!this.refId();
  }

  private handleTipImage(file: File) {
    if (!this.auth.user()) {
      this.error.set('Must be signed in to add a tip');
      return;
    }

    if (this.tipOpen()) {
      this.setTipImage(file);
      return;
    }

    this.openTipDialog(file);
  }

  openTipDialog(imageFile?: File) {
    if (!this.auth.user()) {
      this.error.set('Must be signed in to add a tip');
      return;
    }

    this.tipForm.reset({ text: '', date: this.todayIso() });
    this.clearTipImage();
    if (imageFile) {
      this.setTipImage(imageFile);
    }
    this.tipOpen.set(true);
  }

  closeTipDialog() {
    this.tipOpen.set(false);
    this.tipSubmitting.set(false);
    this.tipForm.reset({ text: '', date: this.todayIso() });
    this.clearTipImage();
  }

  onTipImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    this.setTipImage(file);
    input.value = '';
  }

  removeTipImage() {
    this.clearTipImage();
  }

  canSubmitTip() {
    const text = this.tipForm.value.text?.trim() ?? '';
    return (text.length > 0 || !!this.tipImageFile()) && !this.tipSubmitting();
  }

  async submitTip() {
    const collection = this.collection();
    const refId = this.refId();
    if (!collection || !refId || !this.canSubmitTip()) return;

    const text = this.tipForm.value.text?.trim() ?? '';
    const imageFile = this.tipImageFile();
    const date = this.tipForm.value.date?.trim() ?? '';

    this.closeTipDialog();
    this.tipSubmitting.set(true);
    this.error.set(null);

    try {
      const payload: { imageUrl?: string; date?: string } = {};
      if (imageFile) {
        payload.imageUrl = await this.feedService.uploadTipImage(imageFile);
      }
      if (date) {
        payload.date = date;
      }
      await this.feedService.push(
        'tip',
        text,
        collection,
        refId,
        Object.keys(payload).length ? payload : undefined
      );
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Tip submit failed');
    } finally {
      this.tipSubmitting.set(false);
    }
  }

  private todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  private setTipImage(file: File) {
    this.clearTipImage();
    this.tipImageFile.set(file);
    this.tipImagePreview.set(URL.createObjectURL(file));
  }

  private clearTipImage() {
    const preview = this.tipImagePreview();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    this.tipImageFile.set(null);
    this.tipImagePreview.set(null);
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
    this.error.set(null);

    try {
      await this.feedService.push('question', text, collection, refId);
      this.feedForm.reset();
    } catch (err: any) {
      this.error.set(err?.message ?? 'Question submit failed');
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
      this.error.set('Must be signed in to vote');
      return;
    }

    this.votingEntryId.set(entryId);
    this.error.set(null);

    try {
      const result = await this.feedService.vote(entryId, direction);
      this.updateEntry(entryId, entry => ({
        ...entry,
        score: result.score,
        userVote: result.userVote,
      }));
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      this.votingEntryId.set(null);
    }
  }

  async editEntry(item: FeedEntryView, text: string) {
    const entryId = item.entry.id;
    if (!entryId || this.managingEntryId()) return;

    this.managingEntryId.set(entryId);
    this.error.set(null);

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
      this.error.set(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      this.managingEntryId.set(null);
    }
  }

  async deleteEntry(item: FeedEntryView) {
    const entryId = item.entry.id;
    if (!entryId || this.managingEntryId()) return;

    if (!confirm('Delete this post?')) return;

    this.managingEntryId.set(entryId);
    this.error.set(null);

    try {
      await this.feedService.remove(entryId);
      this.feedTimeline.update(timeline =>
        timeline.flatMap((item): FeedTimelineItem[] => {
          if (item.kind === 'tipActivity') {
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
      this.error.set(err instanceof Error ? err.message : 'Delete failed');
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

  private updateEntry(entryId: string, updater: (entry: FeedEntryView) => FeedEntryView) {
    this.feedTimeline.update(timeline =>
      timeline.map(item => {
        if (item.kind === 'tipActivity') {
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

  private async applyEntries(entries: FeedEntryRecord[], userId: string | null) {
    const visible = filterVisibleFeedEntries(entries);
    const entryIds = visible.map(entry => entry.id).filter((id): id is string => !!id);
    const userIds = [...new Set(visible.map(entry => entry.createdBy))];

    const [users, userVotes] = await Promise.all([
      Promise.all(userIds.map(userId => this.userService.getById(userId))),
      this.feedService.pullUserVotes(userId, entryIds).catch(() => new Map()),
    ]);
    const userMap = new Map(userIds.map((id, index) => [id, users[index]]));

    const views = visible.map(entry => {
      const user = userMap.get(entry.createdBy);
      const displayName = user?.displayName ?? 'Angler';

      return {
        entry,
        displayName,
        photoUrl: user?.photoUrl,
        initials: this.initialsFrom(displayName),
        score: entry.score ?? 0,
        userVote: entry.id ? (userVotes.get(entry.id) ?? null) : null,
      };
    });

    const tips = views.filter(view => view.entry.type === 'tip');
    const threads = this.buildThreads(views.filter(view => view.entry.type !== 'tip'));

    this.feedTimeline.set(buildFeedTimeline(threads, tips));
  }

  private buildThreads(entries: FeedEntryView[]): FeedThread[] {
    const byId = new Map<string, FeedEntryView>();
    for (const entry of entries) {
      if (entry.entry.id) {
        byId.set(entry.entry.id, entry);
      }
    }
    const repliesByParent = new Map<string, FeedEntryView[]>();
    const roots: FeedEntryView[] = [];

    for (const entry of entries) {
      const replyTo = entry.entry.replyTo;
      if (replyTo && byId.has(replyTo)) {
        const replies = repliesByParent.get(replyTo) ?? [];
        replies.push(entry);
        repliesByParent.set(replyTo, replies);
      } else if (entry.entry.type !== 'answer' && entry.entry.type !== 'tip') {
        roots.push(entry);
      }
    }

    return roots.map(item => ({
      item,
      replies: (item.entry.id ? (repliesByParent.get(item.entry.id) ?? []) : []).sort((a, b) =>
        a.entry.createdAt.localeCompare(b.entry.createdAt)
      ),
    }));
  }

  private initialsFrom(name: string) {
    return (
      name
        .trim()
        .split(/\s+/)
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'
    );
  }
}
