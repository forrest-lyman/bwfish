import { createFeature, createReducer, on } from '@ngrx/store';
import { UserActions } from './user.actions';
import { initialUserState } from './user.models';

export const userFeature = createFeature({
  name: 'user',
  reducer: createReducer(
    initialUserState,
    on(UserActions.sessionChanged, (state, { authUser, profile }) => ({
      ...state,
      authUser,
      profile,
      ready: true,
    })),
    on(UserActions.profileUpdated, (state, { profile }) => ({
      ...state,
      profile,
    })),
  ),
});
