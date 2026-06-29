import { createSelector } from '@ngrx/store';
import { toContentPageItem } from '../shared/entity.util';
import { fishFeature } from './fish.reducer';

export const {
  selectFishState,
  selectEntities,
  selectCurrentId,
  selectLoading,
  selectError,
} = fishFeature;

export const selectCurrentFish = createSelector(
  selectCurrentId,
  selectEntities,
  (currentId, entities) => (currentId ? (entities[currentId] ?? null) : null),
);

export const selectCurrentFishPageItem = createSelector(selectCurrentFish, fish =>
  fish ? toContentPageItem(fish, 'fish', { regionIds: fish.regionIds }) : null,
);

export const selectFishById = (id: string) =>
  createSelector(selectEntities, entities => entities[id] ?? null);

export const selectFishByIds = (ids: string[]) =>
  createSelector(selectEntities, entities =>
    ids.map(id => entities[id]).filter((fish): fish is NonNullable<typeof fish> => !!fish),
  );
