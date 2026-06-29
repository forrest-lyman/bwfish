import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Port } from '@bwfish/core';

export const PortActions = createActionGroup({
  source: 'Ports',
  events: {
    Load: props<{ id: string; setCurrent?: boolean }>(),
    'Load Success': props<{ id: string; port: Port | null }>(),
    'Load Failure': props<{ id: string; error: string }>(),
    'Load By Region': props<{ regionId: string }>(),
    'Load By Region Success': props<{ regionId: string; ports: Port[] }>(),
    'Load By Region Failure': props<{ regionId: string; error: string }>(),
    'Clear Current': emptyProps(),
  },
});
