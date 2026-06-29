import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { catchError, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { PageService } from '../../services/page.service';
import { PageActions } from './page.actions';
import { pageRefFromRouterState, pageRefKey } from './page-route.util';

@Injectable()
export class PageEffects {
  private actions$ = inject(Actions);
  private pageService = inject(PageService);

  loadFromRouter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(({ payload }) => pageRefFromRouterState(payload.routerState)),
      distinctUntilChanged((prev, next) => pageRefKey(prev) === pageRefKey(next)),
      map(ref =>
        ref
          ? PageActions.load({ collection: ref.collection, id: ref.id })
          : PageActions.clear({ reason: 'navigation' })
      ),
    ),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PageActions.load),
      switchMap(({ collection, id }) =>
        from(this.pageService.getPage(collection, id)).pipe(
          map(page =>
            PageActions.loadSuccess({
              collection,
              id,
              page,
              sourceBody: page?.body ?? '',
            }),
          ),
          catchError((err: unknown) =>
            of(
              PageActions.loadFailure({
                error: err instanceof Error ? err.message : 'Failed to load page',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
