import type { Fish } from '@bwfish/core';

export interface FishState {
  entities: Record<string, Fish>;
  currentId: string | null;
  loading: Record<string, boolean>;
  error: string | null;
}

export const initialFishState: FishState = {
  entities: {},
  currentId: null,
  loading: {},
  error: null,
};
