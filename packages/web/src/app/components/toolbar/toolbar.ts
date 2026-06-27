import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-toolbar',
  imports: [RouterLink],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  navToggle = output<void>();
  auth = inject(AuthService);
  userService = inject(UserService);

  menuOpen = signal(false);
  showSignIn = signal(false);
  authError = signal<string | null>(null);

  initials() {
    const name =
      this.userService.profile()?.displayName ??
      this.auth.user()?.displayName ??
      this.auth.user()?.email ??
      '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  toggleNav() {
    this.navToggle.emit();
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  async signOut() {
    await this.auth.signOut();
    this.menuOpen.set(false);
  }

  async signInGoogle() {
    try {
      this.authError.set(null);
      await this.auth.signInWithGoogle();
      this.showSignIn.set(false);
    } catch (e: any) {
      this.authError.set(e?.message ?? 'Sign in failed');
    }
  }

  async signInEmail(email: string, password: string) {
    try {
      this.authError.set(null);
      await this.auth.signInWithEmail(email, password);
      this.showSignIn.set(false);
    } catch (e: any) {
      this.authError.set(e?.message ?? 'Sign in failed');
    }
  }

  async signUpEmail(email: string, password: string) {
    try {
      this.authError.set(null);
      await this.auth.signUpWithEmail(email, password);
      this.showSignIn.set(false);
    } catch (e: any) {
      this.authError.set(e?.message ?? 'Sign up failed');
    }
  }
}
