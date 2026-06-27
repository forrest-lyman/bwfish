import { Component, input } from '@angular/core';
import { NavRegion } from './nav-region/nav-region';
import { NavUser } from './nav-user/nav-user';

export type NavScope = 'region' | 'user';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [NavRegion, NavUser],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav {
  scope = input<NavScope>('region');
}
