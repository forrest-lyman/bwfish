import type { Spot } from '@bwfish/core';

export interface SpotsState {
  entities: Record<string, Spot>;
  byPort: Record<string, string[]>;
  currentId: string | null;
  loading: Record<string, boolean>;
  error: string | null;
}

export const initialSpotsState: SpotsState = {
  entities: {},
  byPort: {},
  currentId: null,
  loading: {},
  error: null,
};
