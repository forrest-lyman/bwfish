import { createFeature, createReducer, on } from '@ngrx/store';
import { FishActions } from './fish.actions';
import { initialFishState } from './fish.models';

export const fishFeature = createFeature({
  name: 'fish',
  reducer: createReducer(
    initialFishState,
    on(FishActions.load, (state, { id, setCurrent = true }) => ({
      ...state,
      currentId: setCurrent ? id : state.currentId,
      loading: { ...state.loading, [id]: true },
      error: null,
    })),
    on(FishActions.loadSuccess, (state, { id, fish }) => ({
      ...state,
      entities: fish ? { ...state.entities, [id]: fish } : state.entities,
      loading: { ...state.loading, [id]: false },
      error: null,
    })),
    on(FishActions.loadFailure, (state, { id, error }) => ({
      ...state,
      loading: { ...state.loading, [id]: false },
      error,
    })),
    on(FishActions.loadMany, (state, { ids }) => ({
      ...state,
      loading: {
        ...state.loading,
        ...Object.fromEntries(ids.map(id => [id, true])),
      },
      error: null,
    })),
    on(FishActions.loadManySuccess, (state, { fish }) => ({
      ...state,
      entities: {
        ...state.entities,
        ...Object.fromEntries(fish.map(entry => [entry.id, entry])),
      },
      loading: {
        ...state.loading,
        ...Object.fromEntries(fish.map(entry => [entry.id, false])),
      },
      error: null,
    })),
    on(FishActions.loadManyFailure, (state, { ids, error }) => ({
      ...state,
      loading: {
        ...state.loading,
        ...Object.fromEntries(ids.map(id => [id, false])),
      },
      error,
    })),
    on(FishActions.clearCurrent, state => ({
      ...state,
      currentId: null,
    })),
  ),
});
