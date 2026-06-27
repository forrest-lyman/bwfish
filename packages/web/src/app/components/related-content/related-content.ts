import { Component, effect, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface RelatedSection {
  label: string;
  items: { id: string; title: string; summary: string; link: string[] }[];
}

@Component({
  selector: 'app-related-content',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './related-content.html',
  styleUrl: './related-content.scss',
})
export class RelatedContent {
  sections = input<RelatedSection[]>([]);
  activeTab = signal(0);

  constructor() {
    effect(() => {
      this.sections();
      this.activeTab.set(0);
    });
  }

  selectTab(index: number) {
    this.activeTab.set(index);
  }
}
