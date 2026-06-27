import { Component, inject, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

interface Crumb {
  label: string;
  path: string | null;
}

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
  private router = inject(Router);

  crumbs = signal<Crumb[]>([]);
  menuOpen = signal(false);
  showSignIn = signal(false);
  authError = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.buildCrumbs());
    this.buildCrumbs();
  }

  private buildCrumbs() {
    const segments = this.router.url.replace(/^\//, '').split('/').filter(Boolean);
    if (segments.length === 0) {
      this.crumbs.set([{ label: 'Home', path: null }]);
      return;
    }

    const crumbs: Crumb[] = [{ label: 'Home', path: '/' }];
    let path = '';
    for (let i = 0; i < segments.length; i++) {
      path += '/' + segments[i];
      crumbs.push({
        label: segments[i].replace(/-/g, ' '),
        path: i < segments.length - 1 ? path : null,
      });
    }
    this.crumbs.set(crumbs);
  }

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
