import { createFeature, createReducer, on } from '@ngrx/store';
import { listLoadingKey } from '../shared/entity.util';
import { SpotActions } from './spots.actions';
import { initialSpotsState } from './spots.models';

export const spotsFeature = createFeature({
  name: 'spots',
  reducer: createReducer(
    initialSpotsState,
    on(SpotActions.load, (state, { id, setCurrent = true }) => ({
      ...state,
      currentId: setCurrent ? id : state.currentId,
      loading: { ...state.loading, [id]: true },
      error: null,
    })),
    on(SpotActions.loadSuccess, (state, { id, spot }) => ({
      ...state,
      entities: spot ? { ...state.entities, [id]: spot } : state.entities,
      loading: { ...state.loading, [id]: false },
      error: null,
    })),
    on(SpotActions.loadFailure, (state, { id, error }) => ({
      ...state,
      loading: { ...state.loading, [id]: false },
      error,
    })),
    on(SpotActions.loadByPort, (state, { portId }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('port', portId)]: true },
      error: null,
    })),
    on(SpotActions.loadByPortSuccess, (state, { portId, spots }) => ({
      ...state,
      byPort: { ...state.byPort, [portId]: spots.map(spot => spot.id) },
      entities: {
        ...state.entities,
        ...Object.fromEntries(spots.map(spot => [spot.id, spot])),
      },
      loading: { ...state.loading, [listLoadingKey('port', portId)]: false },
      error: null,
    })),
    on(SpotActions.loadByPortFailure, (state, { portId, error }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('port', portId)]: false },
      error,
    })),
    on(SpotActions.clearCurrent, state => ({
      ...state,
      currentId: null,
    })),
  ),
});
