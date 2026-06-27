import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';
import { NavService } from '../../../services/nav.service';

@Component({
  selector: 'app-nav-region',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideChevronRight],
  templateUrl: './nav-region.html',
  styleUrl: './nav-region.scss',
})
export class NavRegion implements OnInit {
  nav = inject(NavService);

  async ngOnInit() {
    await this.nav.load();
  }
}
