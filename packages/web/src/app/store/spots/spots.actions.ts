import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Spot } from '@bwfish/core';

export const SpotActions = createActionGroup({
  source: 'Spots',
  events: {
    Load: props<{ id: string; setCurrent?: boolean }>(),
    'Load Success': props<{ id: string; spot: Spot | null }>(),
    'Load Failure': props<{ id: string; error: string }>(),
    'Load By Port': props<{ portId: string }>(),
    'Load By Port Success': props<{ portId: string; spots: Spot[] }>(),
    'Load By Port Failure': props<{ portId: string; error: string }>(),
    'Clear Current': emptyProps(),
  },
});
