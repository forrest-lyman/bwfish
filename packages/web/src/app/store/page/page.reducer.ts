import { createFeature, createReducer, on } from '@ngrx/store';
import { PageActions } from './page.actions';
import { initialPageState } from './page.models';

export const pageFeature = createFeature({
  name: 'page',
  reducer: createReducer(
    initialPageState,
    on(PageActions.load, (state, { collection, id }) => ({
      ...state,
      collection,
      id,
      page: null,
      sourceBody: '',
      loading: true,
      error: null,
    })),
    on(PageActions.loadSuccess, (state, { collection, id, page, sourceBody }) => ({
      ...state,
      collection,
      id,
      page,
      sourceBody,
      loading: false,
      error: null,
    })),
    on(PageActions.loadFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),
    on(PageActions.clear, () => initialPageState),
  ),
});
