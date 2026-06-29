import { createSelector } from '@ngrx/store';
import { toContentPageItem } from '../shared/entity.util';
import { regionsFeature } from './regions.reducer';

export const {
  selectRegionsState,
  selectEntities,
  selectAllIds,
  selectCurrentId,
  selectLoading,
  selectError,
} = regionsFeature;

export const selectAllRegions = createSelector(selectAllIds, selectEntities, (allIds, entities) =>
  allIds ? allIds.map(id => entities[id]).filter((region): region is NonNullable<typeof region> => !!region) : [],
);

export const selectCurrentRegion = createSelector(
  selectCurrentId,
  selectEntities,
  (currentId, entities) => (currentId ? (entities[currentId] ?? null) : null),
);

export const selectCurrentRegionPageItem = createSelector(selectCurrentRegion, region =>
  region ? toContentPageItem(region, 'regions', { fishIds: region.fishIds }) : null,
);

export const selectRegionById = (id: string) =>
  createSelector(selectEntities, entities => entities[id] ?? null);

export const selectRegionsByIds = (ids: string[]) =>
  createSelector(selectEntities, entities =>
    ids.map(id => entities[id]).filter((region): region is NonNullable<typeof region> => !!region),
  );

export const selectAllRegionsLoading = createSelector(selectLoading, loading => !!loading['all']);
