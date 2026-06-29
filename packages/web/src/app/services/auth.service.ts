import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { Store } from '@ngrx/store';
import { selectAuthUser, selectReady } from '../store/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private store = inject(Store);

  user = toSignal(this.store.select(selectAuthUser), { initialValue: null });
  ready = toSignal(this.store.select(selectReady), { initialValue: false });

  signInWithGoogle() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signUpWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  signOut() {
    return signOut(this.auth);
  }
}
