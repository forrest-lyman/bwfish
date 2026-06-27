import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { PortService } from '../services/port.service';
import { Page, type ContentPageItem } from '../components/page/page';

@Component({
  selector: 'app-port',
  standalone: true,
  imports: [Page, Layout],
  template: `
    <app-layout>
      @if (item()) {
        <app-page [item]="item()!" />
      }
    </app-layout>
  `,
})
export class PortPage implements OnInit {
  private route = inject(ActivatedRoute);
  private portService = inject(PortService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const portId = this.route.snapshot.paramMap.get('port')!;
    const port = await this.portService.getById(portId);
    if (port) this.item.set({ ...port, collection: 'ports' });
  }
}
