import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { LucideSendHorizontal } from '@lucide/angular';
import type { Collection } from '@bwfish/core';
import { AuthService } from '../../services/auth.service';
import { FeedService } from '../../services/feed.service';
import { UserService } from '../../services/user.service';
import { FeedEntry, type FeedEntryView } from '../feed-entry/feed-entry';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [ReactiveFormsModule, LucideSendHorizontal, FeedEntry],
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

  feedEntries = signal<FeedEntryView[]>([]);
  submitting = signal(false);
  votingEntryId = signal<string | null>(null);
  managingEntryId = signal<string | null>(null);
  error = signal<string | null>(null);
  feedForm = new FormGroup({
    text: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });
  private textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');

  constructor() {
    effect(() => {
      const collection = this.collection();
      const refId = this.refId();
      if (!this.auth.ready()) return;
      this.auth.user();
      void this.loadEntries(collection, refId);
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
      await this.loadEntries(collection, refId);
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
      this.feedEntries.update(entries =>
        entries.map(entry =>
          entry.entry.id === entryId
            ? { ...entry, score: result.score, userVote: result.userVote }
            : entry
        )
      );
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
      this.feedEntries.update(entries =>
        entries.map(entry =>
          entry.entry.id === entryId
            ? {
                ...entry,
                entry: {
                  ...entry.entry,
                  text,
                  lastModified: new Date().toISOString(),
                },
              }
            : entry
        )
      );
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
      this.feedEntries.update(entries => entries.filter(entry => entry.entry.id !== entryId));
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      this.managingEntryId.set(null);
    }
  }

  async reload() {
    const collection = this.collection();
    const refId = this.refId();
    await this.loadEntries(collection, refId);
  }

  private async loadEntries(collection: Collection | null, refId: string | null) {
    if (!collection || !refId) {
      this.feedEntries.set([]);
      return;
    }

    try {
      const entries = await this.feedService.pull(collection, refId);
      const entryIds = entries.map(entry => entry.id).filter((id): id is string => !!id);
      const userIds = [...new Set(entries.map(entry => entry.createdBy))];

      const [users, userVotes] = await Promise.all([
        Promise.all(userIds.map(userId => this.userService.getById(userId))),
        this.feedService.pullUserVotes(this.auth.user()?.uid ?? null, entryIds).catch(() => new Map()),
      ]);
      const userMap = new Map(userIds.map((userId, index) => [userId, users[index]]));

      this.feedEntries.set(
        entries.map(entry => {
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
        })
      );
    } catch (err: unknown) {
      this.feedEntries.set([]);
      this.error.set(err instanceof Error ? err.message : 'Failed to load questions');
    }
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
