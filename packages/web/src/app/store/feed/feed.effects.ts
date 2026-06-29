import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, from, map, mergeMap, of, switchMap, takeUntil } from 'rxjs';
import { FeedService } from '../../services/feed.service';
import { UserService } from '../../services/user.service';
import { FeedActions } from './feed.actions';
import { buildFeedTimelineFromEntries, feedKey } from './feed.models';

@Injectable()
export class FeedEffects {
  private actions$ = inject(Actions);
  private feedService = inject(FeedService);
  private userService = inject(UserService);

  subscribe$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FeedActions.subscribe),
      mergeMap(({ collection, refId, userId }) => {
        const key = feedKey(collection, refId);

        return this.feedService.subscribe(collection, refId).pipe(
          switchMap(entries =>
            from(buildFeedTimelineFromEntries(entries, userId, this.userService, this.feedService)).pipe(
              map(timeline => FeedActions.timelineUpdated({ key, timeline }))
            )
          ),
          catchError((err: unknown) =>
            of(
              FeedActions.timelineFailed({
                key,
                error: err instanceof Error ? err.message : 'Failed to load feed',
              })
            )
          ),
          takeUntil(
            this.actions$.pipe(
              ofType(FeedActions.unsubscribe),
              filter(action => feedKey(action.collection, action.refId) === key)
            )
          )
        );
      })
    )
  );
}
