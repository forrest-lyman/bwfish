import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Layout } from '../../components/layout/layout';
import { Page } from '../../components/page/page';
import { selectCurrentFishPageItem } from '../../store';

@Component({
  selector: 'app-fish',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './fish.html',
  styleUrl: './fish.scss',
})
export class Fish {
  private store = inject(Store);

  item = toSignal(this.store.select(selectCurrentFishPageItem), { initialValue: null });
}
