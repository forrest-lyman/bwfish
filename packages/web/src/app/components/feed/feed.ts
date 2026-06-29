import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { LucideSendHorizontal } from '@lucide/angular';
import type { Collection, FeedEntry as FeedEntryRecord } from '@bwfish/core';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import { UserService } from '../../services/user.service';
import { FeedEntry, extractCorrectionPayload, filterVisibleFeedEntries, type FeedEntryView, type FeedThread } from '../feed-entry/feed-entry';
import { Dialog } from '../dialog/dialog';
import { MarkdownDiff } from '../markdown-diff/markdown-diff';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [ReactiveFormsModule, LucideSendHorizontal, FeedEntry, Dialog, MarkdownDiff],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  title = input<string>('');
  collection = input<Collection | null>(null);
  refId = input<string | null>(null);
  layout = input<'inline' | 'sidebar'>('inline');

  auth = inject(AuthService);
  private feedService = inject(FeedService);
  private userService = inject(UserService);

  feedThreads = signal<FeedThread[]>([]);
  submitting = signal(false);
  votingEntryId = signal<string | null>(null);
  managingEntryId = signal<string | null>(null);
  error = signal<string | null>(null);
  reviewOpen = signal(false);
  reviewOriginal = signal('');
  reviewModified = signal('');
  feedForm = new FormGroup({
    text: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });
  private textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');

  constructor() {
    effect(onCleanup => {
      const collection = this.collection();
      const refId = this.refId();
      if (!this.auth.ready()) return;
      const userId = this.auth.user()?.uid ?? null;

      if (!collection || !refId) {
        this.feedThreads.set([]);
        return;
      }

      this.error.set(null);

      const sub = this.feedService.subscribe(collection, refId).subscribe({
        next: entries => void this.applyEntries(entries, userId),
        error: err => {
          this.feedThreads.set([]);
          this.error.set(err instanceof Error ? err.message : 'Failed to load questions');
        },
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  prompt() {
    return `Ask anything about ${this.title()}`;
  }

  resizeTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  async submit() {
    const collection = this.collection();
    const refId = this.refId();
    if (!collection || !refId || this.feedForm.invalid || this.submitting()) return;

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
      this.feedThreads.update(threads =>
        threads
          .filter(thread => thread.item.entry.id !== entryId)
          .map(thread => ({
            ...thread,
            replies: thread.replies.filter(reply => reply.entry.id !== entryId),
          }))
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
    this.feedThreads.update(threads =>
      threads.map(thread => ({
        item: thread.item.entry.id === entryId ? updater(thread.item) : thread.item,
        replies: thread.replies.map(reply =>
          reply.entry.id === entryId ? updater(reply) : reply
        ),
      }))
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

    this.feedThreads.set(this.buildThreads(views));
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
      } else if (entry.entry.type !== 'answer') {
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
