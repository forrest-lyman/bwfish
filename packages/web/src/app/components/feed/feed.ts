import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, effect, inject, input, signal } from '@angular/core';
import { LucideSendHorizontal } from '@lucide/angular';
import type { Collection, FeedEntry } from '@bwfish/core';
import { FeedService } from '../../services/feed.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [ReactiveFormsModule, LucideSendHorizontal],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  title = input<string>('');
  collection = input<Collection | null>(null);
  refId = input<string | null>(null);

  private feedService = inject(FeedService);

  feedEntries = signal<FeedEntry[]>([]);
  submitting = signal(false);
  error = signal<string | null>(null);
  feedForm = new FormGroup({
    text: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  constructor() {
    effect(() => {
      const collection = this.collection();
      const refId = this.refId();
      void this.loadEntries(collection, refId);
    });
  }

  prompt() {
    return `Ask a question about ${this.title()}`;
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
    }
  }

  private async loadEntries(collection: Collection | null, refId: string | null) {
    if (!collection || !refId) {
      this.feedEntries.set([]);
      return;
    }

    this.feedEntries.set(await this.feedService.pull(collection, refId));
  }
}