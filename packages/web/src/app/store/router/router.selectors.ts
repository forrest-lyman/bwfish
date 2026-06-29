import { getRouterSelectors } from '@ngrx/router-store';

export const {
  selectCurrentRoute,
  selectRouteParams,
  selectRouteParam,
  selectRouteData,
  selectUrl,
} = getRouterSelectors();
