import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Layout } from '../../components/layout/layout';
import { Page } from '../../components/page/page';
import { selectCurrentTechniquePageItem } from '../../store';

@Component({
  selector: 'app-technique',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './technique.html',
  styleUrl: './technique.scss',
})
export class Technique {
  private store = inject(Store);

  item = toSignal(this.store.select(selectCurrentTechniquePageItem), { initialValue: null });
}
