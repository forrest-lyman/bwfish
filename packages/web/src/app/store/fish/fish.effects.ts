import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, from, map, of, switchMap, withLatestFrom } from 'rxjs';
import { FishService } from '../../services/fish.service';
import { uncachedIds } from '../shared/entity.util';
import { FishActions } from './fish.actions';
import { selectEntities, selectLoading } from './fish.selectors';

@Injectable()
export class FishEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private fishService = inject(FishService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FishActions.load),
      switchMap(({ id }) =>
        from(this.fishService.getById(id)).pipe(
          map(fish => FishActions.loadSuccess({ id, fish })),
          catchError((err: unknown) =>
            of(
              FishActions.loadFailure({
                id,
                error: err instanceof Error ? err.message : 'Failed to load fish',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadMany$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FishActions.loadMany),
      withLatestFrom(this.store.select(selectEntities), this.store.select(selectLoading)),
      switchMap(([{ ids }, entities, loading]) => {
        const pending = uncachedIds(ids, entities, loading);
        if (pending.length === 0) {
          return of(FishActions.loadManySuccess({ fish: ids.map(id => entities[id]).filter(Boolean) }));
        }

        return from(Promise.all(pending.map(id => this.fishService.getById(id)))).pipe(
          map(results => FishActions.loadManySuccess({ fish: results.filter((fish): fish is NonNullable<typeof fish> => fish !== null) })),
          catchError((err: unknown) =>
            of(
              FishActions.loadManyFailure({
                error: err instanceof Error ? err.message : 'Failed to load fish',
              }),
            ),
          ),
        );
      }),
    ),
  );
}
