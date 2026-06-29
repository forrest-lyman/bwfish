import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { SpotService } from '../../services/spot.service';
import { SpotActions } from './spots.actions';

@Injectable()
export class SpotsEffects {
  private actions$ = inject(Actions);
  private spotService = inject(SpotService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SpotActions.load),
      switchMap(({ id }) =>
        from(this.spotService.getById(id)).pipe(
          map(spot => SpotActions.loadSuccess({ id, spot })),
          catchError((err: unknown) =>
            of(
              SpotActions.loadFailure({
                id,
                error: err instanceof Error ? err.message : 'Failed to load spot',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadByPort$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SpotActions.loadByPort),
      switchMap(({ portId }) =>
        from(this.spotService.getByPort(portId)).pipe(
          map(spots => SpotActions.loadByPortSuccess({ portId, spots })),
          catchError((err: unknown) =>
            of(
              SpotActions.loadByPortFailure({
                portId,
                error: err instanceof Error ? err.message : 'Failed to load spots',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
