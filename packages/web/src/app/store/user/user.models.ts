import type { UserProfile } from '@bwfish/core';
import type { User } from '@angular/fire/auth';

export interface AuthUserSnapshot {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserState {
  authUser: AuthUserSnapshot | null;
  profile: UserProfile | null;
  ready: boolean;
}

export const initialUserState: UserState = {
  authUser: null,
  profile: null,
  ready: false,
};

export function toAuthUserSnapshot(user: User): AuthUserSnapshot {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}
