import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Layout } from '../../components/layout/layout';
import { Page } from '../../components/page/page';
import { selectCurrentRegionPageItem } from '../../store';

@Component({
  selector: 'app-region',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './region.html',
  styleUrl: './region.scss',
})
export class Region {
  private store = inject(Store);

  item = toSignal(this.store.select(selectCurrentRegionPageItem), { initialValue: null });
}
