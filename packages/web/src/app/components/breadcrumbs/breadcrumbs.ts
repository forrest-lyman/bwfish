import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Crumb {
  label: string;
  path: string | null;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
})
export class Breadcrumbs {
  private router = inject(Router);

  crumbs = signal<Crumb[]>([]);

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
}
