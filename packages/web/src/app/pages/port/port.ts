import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../../components/layout/layout';
import { Page, type ContentPageItem } from '../../components/page/page';
import { PortService } from '../../services/port.service';

@Component({
  selector: 'app-port',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './port.html',
  styleUrl: './port.scss',
})
export class Port implements OnInit {
  private route = inject(ActivatedRoute);
  private portService = inject(PortService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const portId = this.route.snapshot.paramMap.get('port')!;
    const port = await this.portService.getById(portId);
    this.item.set(port ? { ...port, collection: 'ports' } : null);
  }
}
