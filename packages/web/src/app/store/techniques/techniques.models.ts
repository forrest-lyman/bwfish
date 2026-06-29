import type { Technique } from '@bwfish/core';

export interface TechniquesState {
  entities: Record<string, Technique>;
  byFish: Record<string, string[]>;
  currentId: string | null;
  loading: Record<string, boolean>;
  error: string | null;
}

export const initialTechniquesState: TechniquesState = {
  entities: {},
  byFish: {},
  currentId: null,
  loading: {},
  error: null,
};
