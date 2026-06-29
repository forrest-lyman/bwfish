import { createSelector } from '@ngrx/store';
import { pageFeature } from './page.reducer';

export const {
  selectPageState,
  selectCollection,
  selectId,
  selectPage,
  selectSourceBody,
  selectLoading,
  selectError,
} = pageFeature;

export const selectPageKey = createSelector(
  selectCollection,
  selectId,
  (collection, id) => (collection && id ? `${collection}__${id}` : null),
);

export const selectIsPageLoaded = createSelector(selectLoading, selectPage, (loading, page) => !loading && page !== undefined);
