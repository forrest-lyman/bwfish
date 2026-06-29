import { createSelector } from '@ngrx/store';
import { listLoadingKey, toContentPageItem } from '../shared/entity.util';
import { portsFeature } from './ports.reducer';

export const {
  selectPortsState,
  selectEntities,
  selectByRegion,
  selectCurrentId,
  selectLoading,
  selectError,
} = portsFeature;

export const selectCurrentPort = createSelector(
  selectCurrentId,
  selectEntities,
  (currentId, entities) => (currentId ? (entities[currentId] ?? null) : null),
);

export const selectCurrentPortPageItem = createSelector(selectCurrentPort, port =>
  port ? toContentPageItem(port, 'ports', { regionId: port.regionId, fishIds: port.fishIds }) : null,
);

export const selectPortsByRegion = (regionId: string) =>
  createSelector(selectByRegion, selectEntities, (byRegion, entities) => {
    const ids = byRegion[regionId] ?? [];
    return ids.map(id => entities[id]).filter((port): port is NonNullable<typeof port> => !!port);
  });

export const selectPortById = (id: string) =>
  createSelector(selectEntities, entities => entities[id] ?? null);

export const selectPortsByIds = (ids: string[]) =>
  createSelector(selectEntities, entities =>
    ids.map(id => entities[id]).filter((port): port is NonNullable<typeof port> => !!port),
  );

export const selectPortsByRegionLoading = (regionId: string) =>
  createSelector(selectLoading, loading => !!loading[listLoadingKey('region', regionId)]);
