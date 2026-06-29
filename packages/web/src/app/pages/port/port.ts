import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Layout } from '../../components/layout/layout';
import { Page } from '../../components/page/page';
import { selectCurrentPortPageItem } from '../../store';

@Component({
  selector: 'app-port',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './port.html',
  styleUrl: './port.scss',
})
export class Port {
  private store = inject(Store);

  item = toSignal(this.store.select(selectCurrentPortPageItem), { initialValue: null });
}
