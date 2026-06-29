import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Region } from '@bwfish/core';

export const RegionActions = createActionGroup({
  source: 'Regions',
  events: {
    'Load All': emptyProps(),
    'Load All Success': props<{ regions: Region[] }>(),
    'Load All Failure': props<{ error: string }>(),
    Load: props<{ id: string; setCurrent?: boolean }>(),
    'Load Success': props<{ id: string; region: Region | null }>(),
    'Load Failure': props<{ id: string; error: string }>(),
    'Clear Current': emptyProps(),
  },
});
