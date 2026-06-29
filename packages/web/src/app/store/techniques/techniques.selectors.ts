import { createSelector } from '@ngrx/store';
import { listLoadingKey, toContentPageItem } from '../shared/entity.util';
import { techniquesFeature } from './techniques.reducer';

export const {
  selectTechniquesState,
  selectEntities,
  selectByFish,
  selectCurrentId,
  selectLoading,
  selectError,
} = techniquesFeature;

export const selectCurrentTechnique = createSelector(
  selectCurrentId,
  selectEntities,
  (currentId, entities) => (currentId ? (entities[currentId] ?? null) : null),
);

export const selectCurrentTechniquePageItem = createSelector(selectCurrentTechnique, technique =>
  technique
    ? toContentPageItem(technique, 'techniques', {
        regionIds: technique.regionIds,
        fishIds: technique.fishIds,
      })
    : null,
);

export const selectTechniquesByFish = (fishId: string) =>
  createSelector(selectByFish, selectEntities, (byFish, entities) => {
    const ids = byFish[fishId] ?? [];
    return ids
      .map(id => entities[id])
      .filter((technique): technique is NonNullable<typeof technique> => !!technique);
  });

export const selectTechniqueById = (id: string) =>
  createSelector(selectEntities, entities => entities[id] ?? null);

export const selectTechniquesByFishLoading = (fishId: string) =>
  createSelector(selectLoading, loading => !!loading[listLoadingKey('fish', fishId)]);
