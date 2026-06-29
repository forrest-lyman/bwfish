import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, from, map, of, switchMap, withLatestFrom } from 'rxjs';
import { FishService } from '../../services/fish.service';
import { FishActions } from './fish.actions';
import { selectEntities } from './fish.selectors';

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
      withLatestFrom(this.store.select(selectEntities)),
      switchMap(([{ ids }, entities]) => {
        const missing = ids.filter(id => !entities[id]);
        if (missing.length === 0) {
          return of(
            FishActions.loadManySuccess({
              ids,
              fish: ids.map(id => entities[id]).filter(Boolean),
            }),
          );
        }

        return from(Promise.all(missing.map(id => this.fishService.getById(id)))).pipe(
          map(results => {
            const loaded = results
              .map((fish, index) => (fish ? { ...fish, id: fish.id || missing[index] } : null))
              .filter((fish): fish is NonNullable<typeof fish> => fish !== null);
            const cached = ids.map(id => entities[id]).filter(Boolean);

            return FishActions.loadManySuccess({ ids, fish: [...cached, ...loaded] });
          }),
          catchError((err: unknown) =>
            of(
              FishActions.loadManyFailure({
                ids,
                error: err instanceof Error ? err.message : 'Failed to load fish',
              }),
            ),
          ),
        );
      }),
    ),
  );
}
