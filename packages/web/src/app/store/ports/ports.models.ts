import type { Port } from '@bwfish/core';

export interface PortsState {
  entities: Record<string, Port>;
  byRegion: Record<string, string[]>;
  currentId: string | null;
  loading: Record<string, boolean>;
  error: string | null;
}

export const initialPortsState: PortsState = {
  entities: {},
  byRegion: {},
  currentId: null,
  loading: {},
  error: null,
};
