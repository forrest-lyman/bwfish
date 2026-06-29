import type { Region } from '@bwfish/core';

export interface RegionsState {
  entities: Record<string, Region>;
  allIds: string[] | null;
  currentId: string | null;
  loading: Record<string, boolean>;
  error: string | null;
}

export const initialRegionsState: RegionsState = {
  entities: {},
  allIds: null,
  currentId: null,
  loading: {},
  error: null,
};
