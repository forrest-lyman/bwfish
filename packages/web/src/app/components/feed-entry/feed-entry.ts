import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideGitCompare, LucidePencil, LucideSparkles, LucideThumbsDown, LucideThumbsUp, LucideTrash2 } from '@lucide/angular';
import { getAgent, type FeedEntry as FeedEntryRecord, type FeedVoteValue } from '@bwfish/core';

export interface FeedEntryView {
  entry: FeedEntryRecord;
  displayName: string;
  photoUrl?: string;
  initials: string;
  score: number;
  userVote: FeedVoteValue | null;
}

export interface FeedThread {
  item: FeedEntryView;
  replies: FeedEntryView[];
}

@Component({
  selector: 'app-feed-entry',
  standalone: true,
  imports: [ReactiveFormsModule, LucideGitCompare, LucidePencil, LucideSparkles, LucideThumbsDown, LucideThumbsUp, LucideTrash2],
  templateUrl: './feed-entry.html',
  styleUrl: './feed-entry.scss',
})
export class FeedEntry {
  item = input.required<FeedEntryView>();
  reply = input(false);
  currentUserId = input<string | null>(null);
  voting = input(false);
  managing = input(false);
  vote = output<'up' | 'down'>();
  edit = output<string>();
  delete = output<void>();
  reviewChanges = output<void>();

  editing = signal(false);
  expanded = signal(false);
  editForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  isAnswer = computed(() => this.item().entry.type === 'answer');
  isCorrection = computed(() => this.item().entry.type === 'correction');
  hasReviewableChanges = computed(
    () => this.isCorrection() && !!extractCorrectionPayload(this.item().entry.payload)
  );

  constructor() {
    effect(() => {
      this.item().entry.id;
      this.item().entry.text;
      this.expanded.set(false);
    });
  }

  canManage = computed(
    () => !!this.currentUserId() && this.currentUserId() === this.item().entry.createdBy
  );

  agentTitle = computed(() => {
    const agentId = this.item().entry.agentId;
    return agentId ? (getAgent(agentId)?.title ?? null) : null;
  });

  typeLabel() {
    switch (this.item().entry.type) {
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

  startEdit() {
    this.editForm.setValue(this.item().entry.text);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
  }

  saveEdit() {
    if (this.editForm.invalid) return;

    this.edit.emit(this.editForm.value.trim());
    this.editing.set(false);
  }
}

export function extractCorrectionPayload(
  payload: unknown
): { original: string; text: string } | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const original = readPayloadString(payload, 'original') ?? readPayloadString(payload, 'originalText');
  const text = readPayloadString(payload, 'text');
  if (original === null || text === null) {
    return null;
  }

  return { original, text };
}

function readPayloadString(payload: object, key: string): string | null {
  if (!(key in payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export function isFlaggedFeedEntry(entry: FeedEntryRecord): boolean {
  return entry.status === 'warning' || entry.status === 'danger';
}

export function filterVisibleFeedEntries(entries: FeedEntryRecord[]): FeedEntryRecord[] {
  const flaggedIds = new Set(
    entries
      .filter(isFlaggedFeedEntry)
      .map(entry => entry.id)
      .filter((id): id is string => !!id)
  );
  const byId = new Map(
    entries
      .filter((entry): entry is FeedEntryRecord & { id: string } => !!entry.id)
      .map(entry => [entry.id, entry])
  );

  return entries.filter(entry => {
    if (isFlaggedFeedEntry(entry)) return false;
    if (entry.replyTo && flaggedIds.has(entry.replyTo)) return false;
    if (entry.type === 'answer') {
      if (!entry.replyTo) return false;
      const parent = byId.get(entry.replyTo);
      if (!parent || isFlaggedFeedEntry(parent)) return false;
    }
    return true;
  });
}
