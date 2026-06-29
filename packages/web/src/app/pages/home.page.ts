import { Component, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Layout } from '../components/layout/layout';
import { RegionActions, selectAllRegions } from '../store';

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
  private store = inject(Store);

  regions = toSignal(this.store.select(selectAllRegions), { initialValue: [] });

  ngOnInit() {
    this.store.dispatch(RegionActions.loadAll());
  }
}
