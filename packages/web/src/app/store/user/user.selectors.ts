import { createSelector } from '@ngrx/store';
import { userFeature } from './user.reducer';

export const {
  selectUserState,
  selectAuthUser,
  selectProfile,
  selectReady,
} = userFeature;

export const selectIsSignedIn = createSelector(selectAuthUser, authUser => authUser !== null);

export const selectDisplayName = createSelector(
  selectProfile,
  selectAuthUser,
  (profile, authUser) =>
    profile?.displayName ?? authUser?.displayName ?? authUser?.email ?? 'Angler',
);
