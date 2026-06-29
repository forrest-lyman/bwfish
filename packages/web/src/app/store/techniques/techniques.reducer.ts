import { createFeature, createReducer, on } from '@ngrx/store';
import { listLoadingKey } from '../shared/entity.util';
import { TechniqueActions } from './techniques.actions';
import { initialTechniquesState } from './techniques.models';

export const techniquesFeature = createFeature({
  name: 'techniques',
  reducer: createReducer(
    initialTechniquesState,
    on(TechniqueActions.load, (state, { id, setCurrent = true }) => ({
      ...state,
      currentId: setCurrent ? id : state.currentId,
      loading: { ...state.loading, [id]: true },
      error: null,
    })),
    on(TechniqueActions.loadSuccess, (state, { id, technique }) => ({
      ...state,
      entities: technique ? { ...state.entities, [id]: technique } : state.entities,
      loading: { ...state.loading, [id]: false },
      error: null,
    })),
    on(TechniqueActions.loadFailure, (state, { id, error }) => ({
      ...state,
      loading: { ...state.loading, [id]: false },
      error,
    })),
    on(TechniqueActions.loadByFish, (state, { fishId }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('fish', fishId)]: true },
      error: null,
    })),
    on(TechniqueActions.loadByFishSuccess, (state, { fishId, techniques }) => ({
      ...state,
      byFish: { ...state.byFish, [fishId]: techniques.map(technique => technique.id) },
      entities: {
        ...state.entities,
        ...Object.fromEntries(techniques.map(technique => [technique.id, technique])),
      },
      loading: { ...state.loading, [listLoadingKey('fish', fishId)]: false },
      error: null,
    })),
    on(TechniqueActions.loadByFishFailure, (state, { fishId, error }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('fish', fishId)]: false },
      error,
    })),
    on(TechniqueActions.clearCurrent, state => ({
      ...state,
      currentId: null,
    })),
  ),
});
