import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Layout } from '../../components/layout/layout';
import { Page } from '../../components/page/page';
import { selectCurrentSpotPageItem } from '../../store';

@Component({
  selector: 'app-spot',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './spot.html',
  styleUrl: './spot.scss',
})
export class Spot {
  private store = inject(Store);

  item = toSignal(this.store.select(selectCurrentSpotPageItem), { initialValue: null });
}
