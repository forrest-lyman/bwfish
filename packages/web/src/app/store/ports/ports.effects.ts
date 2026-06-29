import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { PortService } from '../../services/port.service';
import { PortActions } from './ports.actions';

@Injectable()
export class PortsEffects {
  private actions$ = inject(Actions);
  private portService = inject(PortService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PortActions.load),
      switchMap(({ id }) =>
        from(this.portService.getById(id)).pipe(
          map(port => PortActions.loadSuccess({ id, port })),
          catchError((err: unknown) =>
            of(
              PortActions.loadFailure({
                id,
                error: err instanceof Error ? err.message : 'Failed to load port',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadByRegion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PortActions.loadByRegion),
      switchMap(({ regionId }) =>
        from(this.portService.getByRegion(regionId)).pipe(
          map(ports => PortActions.loadByRegionSuccess({ regionId, ports })),
          catchError((err: unknown) =>
            of(
              PortActions.loadByRegionFailure({
                regionId,
                error: err instanceof Error ? err.message : 'Failed to load ports',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
