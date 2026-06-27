import { Component, input, signal } from '@angular/core';
import { Nav, type NavScope } from '../nav/nav';
import { Toolbar } from '../toolbar/toolbar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [Nav, Toolbar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  scope = input<NavScope>('region');
  navOpen = signal(true);

  toggleNav() {
    this.navOpen.update(value => !value);
  }
}
