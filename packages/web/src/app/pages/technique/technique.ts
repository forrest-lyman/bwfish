import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Layout } from '../../components/layout/layout';
import { Page, type ContentPageItem } from '../../components/page/page';
import { TechniqueService } from '../../services/technique.service';

@Component({
  selector: 'app-technique',
  standalone: true,
  imports: [Layout, Page],
  templateUrl: './technique.html',
  styleUrl: './technique.scss',
})
export class Technique implements OnInit {
  private route = inject(ActivatedRoute);
  private techniqueService = inject(TechniqueService);

  item = signal<ContentPageItem | null>(null);

  async ngOnInit() {
    const techniqueId = this.route.snapshot.paramMap.get('id')!;
    const technique = await this.techniqueService.getById(techniqueId);
    this.item.set(technique ? { ...technique, collection: 'techniques' } : null);
  }
}
