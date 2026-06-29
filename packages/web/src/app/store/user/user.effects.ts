import { inject, Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { createEffect } from '@ngrx/effects';
import { catchError, from, map, Observable, switchMap } from 'rxjs';
import { UserService } from '../../services/user.service';
import { UserActions } from './user.actions';
import { toAuthUserSnapshot } from './user.models';

@Injectable()
export class UserEffects {
  private auth = inject(Auth);
  private userService = inject(UserService);

  authState$ = createEffect(() =>
    new Observable<User | null>(subscriber => onAuthStateChanged(this.auth, user => subscriber.next(user))).pipe(
      switchMap(user => {
        if (!user) {
          return from([UserActions.sessionChanged({ authUser: null, profile: null })]);
        }

        return from(this.userService.ensureProfile(user)).pipe(
          map(profile =>
            UserActions.sessionChanged({
              authUser: toAuthUserSnapshot(user),
              profile,
            })
          ),
          catchError(() =>
            from([
              UserActions.sessionChanged({
                authUser: toAuthUserSnapshot(user),
                profile: null,
              }),
            ])
          )
        );
      })
    )
  );
}
