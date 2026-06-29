import { createActionGroup, props } from '@ngrx/store';
import type { UserProfile } from '@bwfish/core';
import type { AuthUserSnapshot } from './user.models';

export const UserActions = createActionGroup({
  source: 'User',
  events: {
    'Session Changed': props<{ authUser: AuthUserSnapshot | null; profile: UserProfile | null }>(),
    'Profile Updated': props<{ profile: UserProfile }>(),
  },
});
