import { createActionGroup, props } from '@ngrx/store';
import type { Collection, Page } from '@bwfish/core';

export const PageActions = createActionGroup({
  source: 'Page',
  events: {
    Load: props<{ collection: Collection; id: string }>(),
    'Load Success': props<{ collection: Collection; id: string; page: Page | null; sourceBody: string }>(),
    'Load Failure': props<{ error: string }>(),
    Clear: props<{ reason?: string }>(),
  },
});
