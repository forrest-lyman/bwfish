import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideChevronDown, LucideChevronUp, LucideSparkles } from '@lucide/angular';
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
  imports: [ReactiveFormsModule, LucideChevronDown, LucideChevronUp, LucideSparkles],
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

  editing = signal(false);
  editForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  canManage = computed(
    () => !!this.currentUserId() && this.currentUserId() === this.item().entry.createdBy
  );

  agentTitle = computed(() => {
    const agentId = this.item().entry.agentId;
    return agentId ? (getAgent(agentId)?.title ?? null) : null;
  });

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
