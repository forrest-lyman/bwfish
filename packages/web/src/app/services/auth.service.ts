import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private userService = inject(UserService);

  user = signal<User | null>(null);
  ready = signal(false);

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);

      try {
        if (user) {
          await this.userService.ensureProfile(user);
        } else {
          this.userService.clearProfile();
        }
      } finally {
        this.ready.set(true);
      }
    });
  }

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
