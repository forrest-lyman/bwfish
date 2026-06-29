import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { RegionService } from '../../services/region.service';
import { RegionActions } from './regions.actions';

@Injectable()
export class RegionsEffects {
  private actions$ = inject(Actions);
  private regionService = inject(RegionService);

  loadAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegionActions.loadAll),
      switchMap(() =>
        from(this.regionService.getAll()).pipe(
          map(regions => RegionActions.loadAllSuccess({ regions })),
          catchError((err: unknown) =>
            of(
              RegionActions.loadAllFailure({
                error: err instanceof Error ? err.message : 'Failed to load regions',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegionActions.load),
      switchMap(({ id }) =>
        from(this.regionService.getById(id)).pipe(
          map(region => RegionActions.loadSuccess({ id, region })),
          catchError((err: unknown) =>
            of(
              RegionActions.loadFailure({
                id,
                error: err instanceof Error ? err.message : 'Failed to load region',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
