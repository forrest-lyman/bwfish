import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Fish } from '@bwfish/core';

export const FishActions = createActionGroup({
  source: 'Fish',
  events: {
    Load: props<{ id: string; setCurrent?: boolean }>(),
    'Load Success': props<{ id: string; fish: Fish | null }>(),
    'Load Failure': props<{ id: string; error: string }>(),
    'Load Many': props<{ ids: string[] }>(),
    'Load Many Success': props<{ fish: Fish[] }>(),
    'Load Many Failure': props<{ ids: string[]; error: string }>(),
    'Clear Current': emptyProps(),
  },
});
