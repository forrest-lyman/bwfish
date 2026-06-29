import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Technique } from '@bwfish/core';

export const TechniqueActions = createActionGroup({
  source: 'Techniques',
  events: {
    Load: props<{ id: string; setCurrent?: boolean }>(),
    'Load Success': props<{ id: string; technique: Technique | null }>(),
    'Load Failure': props<{ id: string; error: string }>(),
    'Load By Fish': props<{ fishId: string }>(),
    'Load By Fish Success': props<{ fishId: string; techniques: Technique[] }>(),
    'Load By Fish Failure': props<{ fishId: string; error: string }>(),
    'Clear Current': emptyProps(),
  },
});
