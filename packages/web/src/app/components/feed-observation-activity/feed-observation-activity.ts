import { Component, computed, input } from '@angular/core';
import { LucideMessageSquareQuote } from '@lucide/angular';
import type { FeedObservationActivity as FeedObservationActivityItem } from '../feed-entry/feed-entry';

@Component({
  selector: 'app-feed-observation-activity',
  standalone: true,
  imports: [LucideMessageSquareQuote],
  templateUrl: './feed-observation-activity.html',
  styleUrl: './feed-observation-activity.scss',
})
export class FeedObservationActivity {
  activity = input.required<FeedObservationActivityItem>();

  message = computed(() => {
    const { displayName, count, dateLabel } = this.activity();
    const dateSuffix = dateLabel ? ` for ${dateLabel}` : '';

    if (count === 1) {
      return `${displayName} submitted a new observation${dateSuffix}`;
    }

    return `${displayName} submitted ${count} observations${dateSuffix}`;
  });
}
