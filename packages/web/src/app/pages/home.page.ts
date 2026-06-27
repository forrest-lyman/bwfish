import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { RegionService } from '../services/region.service';
import type { Region } from '@bwfish/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Layout],
  styleUrl: './home.page.scss',
  template: `
    <app-layout>
      <div class="home">
        <h1>Where are you fishing?</h1>
        <ul class="regions">
          @for (region of regions(); track region.id) {
            <li>
              <a [routerLink]="['/', region.id]">
                <strong>{{ region.title }}</strong>
                <span>{{ region.summary }}</span>
              </a>
            </li>
          }
        </ul>
      </div>
    </app-layout>
  `,
})
export class HomePage implements OnInit {
  private regionService = inject(RegionService);
  regions = signal<Region[]>([]);

  async ngOnInit() {
    this.regions.set(await this.regionService.getAll());
  }
}
