import { createSelector } from '@ngrx/store';
import { listLoadingKey, toContentPageItem } from '../shared/entity.util';
import { spotsFeature } from './spots.reducer';

export const {
  selectSpotsState,
  selectEntities,
  selectByPort,
  selectCurrentId,
  selectLoading,
  selectError,
} = spotsFeature;

export const selectCurrentSpot = createSelector(
  selectCurrentId,
  selectEntities,
  (currentId, entities) => (currentId ? (entities[currentId] ?? null) : null),
);

export const selectCurrentSpotPageItem = createSelector(selectCurrentSpot, spot =>
  spot
    ? toContentPageItem(spot, 'spots', {
        regionId: spot.regionId,
        fishIds: spot.fishIds,
        portIds: spot.portIds,
      })
    : null,
);

export const selectSpotsByPort = (portId: string) =>
  createSelector(selectByPort, selectEntities, (byPort, entities) => {
    const ids = byPort[portId] ?? [];
    return ids.map(id => entities[id]).filter((spot): spot is NonNullable<typeof spot> => !!spot);
  });

export const selectSpotById = (id: string) =>
  createSelector(selectEntities, entities => entities[id] ?? null);

export const selectSpotsByPortLoading = (portId: string) =>
  createSelector(selectLoading, loading => !!loading[listLoadingKey('port', portId)]);
