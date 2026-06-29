import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { distinctUntilChanged, from, map, mergeMap } from 'rxjs';
import { FishActions } from '../fish/fish.actions';
import { pageRefFromRouterState, pageRefKey } from '../page/page-route.util';
import { PortActions } from '../ports/ports.actions';
import { RegionActions } from '../regions/regions.actions';
import { SpotActions } from '../spots/spots.actions';
import { TechniqueActions } from '../techniques/techniques.actions';

@Injectable()
export class ContentEffects {
  private actions$ = inject(Actions);

  loadEntityFromRouter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(({ payload }) => pageRefFromRouterState(payload.routerState)),
      distinctUntilChanged((prev, next) => pageRefKey(prev) === pageRefKey(next)),
      mergeMap(ref => {
        if (!ref) {
          return from([
            RegionActions.clearCurrent(),
            PortActions.clearCurrent(),
            SpotActions.clearCurrent(),
            FishActions.clearCurrent(),
            TechniqueActions.clearCurrent(),
          ]);
        }

        switch (ref.collection) {
          case 'regions':
            return from([RegionActions.load({ id: ref.id })]);
          case 'ports':
            return from([PortActions.load({ id: ref.id })]);
          case 'spots':
            return from([SpotActions.load({ id: ref.id })]);
          case 'fish':
            return from([FishActions.load({ id: ref.id })]);
          case 'techniques':
            return from([TechniqueActions.load({ id: ref.id })]);
          default:
            return from([]);
        }
      }),
    ),
  );
}
