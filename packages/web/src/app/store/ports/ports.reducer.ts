import { createFeature, createReducer, on } from '@ngrx/store';
import { listLoadingKey } from '../shared/entity.util';
import { PortActions } from './ports.actions';
import { initialPortsState } from './ports.models';

export const portsFeature = createFeature({
  name: 'ports',
  reducer: createReducer(
    initialPortsState,
    on(PortActions.load, (state, { id, setCurrent = true }) => ({
      ...state,
      currentId: setCurrent ? id : state.currentId,
      loading: { ...state.loading, [id]: true },
      error: null,
    })),
    on(PortActions.loadSuccess, (state, { id, port }) => ({
      ...state,
      entities: port ? { ...state.entities, [id]: port } : state.entities,
      loading: { ...state.loading, [id]: false },
      error: null,
    })),
    on(PortActions.loadFailure, (state, { id, error }) => ({
      ...state,
      loading: { ...state.loading, [id]: false },
      error,
    })),
    on(PortActions.loadByRegion, (state, { regionId }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('region', regionId)]: true },
      error: null,
    })),
    on(PortActions.loadByRegionSuccess, (state, { regionId, ports }) => ({
      ...state,
      byRegion: { ...state.byRegion, [regionId]: ports.map(port => port.id) },
      entities: {
        ...state.entities,
        ...Object.fromEntries(ports.map(port => [port.id, port])),
      },
      loading: { ...state.loading, [listLoadingKey('region', regionId)]: false },
      error: null,
    })),
    on(PortActions.loadByRegionFailure, (state, { regionId, error }) => ({
      ...state,
      loading: { ...state.loading, [listLoadingKey('region', regionId)]: false },
      error,
    })),
    on(PortActions.clearCurrent, state => ({
      ...state,
      currentId: null,
    })),
  ),
});
