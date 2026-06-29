import type { Collection } from '@bwfish/core';
import type { RouterReducerState } from '@ngrx/router-store';

export interface PageRouteConfig {
  collection: Collection;
  idParam: string;
}

export function pageRouteData(collection: Collection, idParam: string): { page: PageRouteConfig } {
  return { page: { collection, idParam } };
}

export function pageRefFromRouterState(
  state: RouterReducerState['state'],
): { collection: Collection; id: string } | null {
  let route = state.root;
  let pageConfig: PageRouteConfig | null = null;
  const params: Record<string, string> = { ...route.params };

  while (route.firstChild) {
    route = route.firstChild;
    Object.assign(params, route.params);

    const config = route.data?.['page'] as PageRouteConfig | undefined;
    if (config) {
      pageConfig = config;
    }
  }

  if (!pageConfig) {
    return null;
  }

  const id = params[pageConfig.idParam];
  return id ? { collection: pageConfig.collection, id } : null;
}

export function pageRefKey(ref: { collection: Collection; id: string } | null) {
  return ref ? `${ref.collection}__${ref.id}` : null;
}
