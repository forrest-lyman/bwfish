import { createFeature, createReducer, on } from '@ngrx/store';
import { RegionActions } from './regions.actions';
import { initialRegionsState } from './regions.models';

export const regionsFeature = createFeature({
  name: 'regions',
  reducer: createReducer(
    initialRegionsState,
    on(RegionActions.loadAll, state => ({
      ...state,
      loading: { ...state.loading, all: true },
      error: null,
    })),
    on(RegionActions.loadAllSuccess, (state, { regions }) => ({
      ...state,
      allIds: regions.map(region => region.id),
      entities: {
        ...state.entities,
        ...Object.fromEntries(regions.map(region => [region.id, region])),
      },
      loading: { ...state.loading, all: false },
      error: null,
    })),
    on(RegionActions.loadAllFailure, (state, { error }) => ({
      ...state,
      loading: { ...state.loading, all: false },
      error,
    })),
    on(RegionActions.load, (state, { id, setCurrent = true }) => ({
      ...state,
      currentId: setCurrent ? id : state.currentId,
      loading: { ...state.loading, [id]: true },
      error: null,
    })),
    on(RegionActions.loadSuccess, (state, { id, region }) => ({
      ...state,
      entities: region ? { ...state.entities, [id]: region } : state.entities,
      loading: { ...state.loading, [id]: false },
      error: null,
    })),
    on(RegionActions.loadFailure, (state, { id, error }) => ({
      ...state,
      loading: { ...state.loading, [id]: false },
      error,
    })),
    on(RegionActions.clearCurrent, state => ({
      ...state,
      currentId: null,
    })),
  ),
});
