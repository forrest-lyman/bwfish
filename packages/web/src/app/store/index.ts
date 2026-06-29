import { EnvironmentProviders, isDevMode } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideState } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ContentEffects } from './content/content.effects';
import { feedFeature } from './feed/feed.reducer';
import { FeedEffects } from './feed/feed.effects';
import { fishFeature } from './fish/fish.reducer';
import { FishEffects } from './fish/fish.effects';
import { pageFeature } from './page/page.reducer';
import { PageEffects } from './page/page.effects';
import { portsFeature } from './ports/ports.reducer';
import { PortsEffects } from './ports/ports.effects';
import { regionsFeature } from './regions/regions.reducer';
import { RegionsEffects } from './regions/regions.effects';
import { spotsFeature } from './spots/spots.reducer';
import { SpotsEffects } from './spots/spots.effects';
import { techniquesFeature } from './techniques/techniques.reducer';
import { TechniquesEffects } from './techniques/techniques.effects';
import { userFeature } from './user/user.reducer';
import { UserEffects } from './user/user.effects';

export function provideAppStore(): EnvironmentProviders[] {
  return [
    provideRouterStore(),
    provideState(userFeature),
    provideState(pageFeature),
    provideState(feedFeature),
    provideState(regionsFeature),
    provideState(portsFeature),
    provideState(spotsFeature),
    provideState(fishFeature),
    provideState(techniquesFeature),
    provideEffects(
      UserEffects,
      PageEffects,
      FeedEffects,
      ContentEffects,
      RegionsEffects,
      PortsEffects,
      SpotsEffects,
      FishEffects,
      TechniquesEffects,
    ),
    ...(isDevMode()
      ? [
          provideStoreDevtools({
            maxAge: 25,
            logOnly: false,
            autoPause: true,
          }),
        ]
      : []),
  ];
}

export * from './user';
export * from './page';
export * from './feed';
export * from './router/router.selectors';
export { listLoadingKey, entitiesLoaded, entitiesNotLoading } from './shared/entity.util';

export { RegionActions } from './regions/regions.actions';
export {
  selectAllRegions,
  selectAllRegionsLoading,
  selectCurrentRegion,
  selectCurrentRegionPageItem,
  selectRegionById,
  selectRegionsByIds,
  selectRegionsState,
} from './regions/regions.selectors';

export { PortActions } from './ports/ports.actions';
export {
  selectCurrentPort,
  selectCurrentPortPageItem,
  selectPortById,
  selectPortsByIds,
  selectPortsByRegion,
  selectPortsByRegionLoading,
  selectPortsState,
} from './ports/ports.selectors';

export { SpotActions } from './spots/spots.actions';
export {
  selectCurrentSpot,
  selectCurrentSpotPageItem,
  selectSpotById,
  selectSpotsByPort,
  selectSpotsByPortLoading,
  selectSpotsState,
} from './spots/spots.selectors';

export { FishActions } from './fish/fish.actions';
export {
  selectCurrentFish,
  selectCurrentFishPageItem,
  selectFishById,
  selectFishByIds,
  selectFishState,
} from './fish/fish.selectors';

export { TechniqueActions } from './techniques/techniques.actions';
export {
  selectCurrentTechnique,
  selectCurrentTechniquePageItem,
  selectTechniqueById,
  selectTechniquesByFish,
  selectTechniquesByFishLoading,
  selectTechniquesState,
} from './techniques/techniques.selectors';
