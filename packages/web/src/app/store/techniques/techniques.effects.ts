import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { TechniqueService } from '../../services/technique.service';
import { TechniqueActions } from './techniques.actions';

@Injectable()
export class TechniquesEffects {
  private actions$ = inject(Actions);
  private techniqueService = inject(TechniqueService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechniqueActions.load),
      switchMap(({ id }) =>
        from(this.techniqueService.getById(id)).pipe(
          map(technique => TechniqueActions.loadSuccess({ id, technique })),
          catchError((err: unknown) =>
            of(
              TechniqueActions.loadFailure({
                id,
                error: err instanceof Error ? err.message : 'Failed to load technique',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadByFish$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechniqueActions.loadByFish),
      switchMap(({ fishId }) =>
        from(this.techniqueService.getByFish(fishId)).pipe(
          map(techniques => TechniqueActions.loadByFishSuccess({ fishId, techniques })),
          catchError((err: unknown) =>
            of(
              TechniqueActions.loadByFishFailure({
                fishId,
                error: err instanceof Error ? err.message : 'Failed to load techniques',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
