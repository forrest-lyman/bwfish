import { Component, computed, input } from '@angular/core';
import { LucideMessageSquareQuote } from '@lucide/angular';
import type { FeedTipActivity as FeedTipActivityItem } from '../feed-entry/feed-entry';

@Component({
  selector: 'app-feed-tip-activity',
  standalone: true,
  imports: [LucideMessageSquareQuote],
  templateUrl: './feed-tip-activity.html',
  styleUrl: './feed-tip-activity.scss',
})
export class FeedTipActivity {
  activity = input.required<FeedTipActivityItem>();

  message = computed(() => {
    const { displayName, count } = this.activity();
    if (count === 1) {
      return `${displayName} submitted a new tip`;
    }
    return `${displayName} submitted ${count} tips`;
  });
}
