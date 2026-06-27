import { Injectable, inject, signal } from '@angular/core';
import { RegionService } from './region.service';
import { PortService } from './port.service';
import type { Region, Port } from '@bwfish/core';

export interface RegionNode {
  region: Region;
  ports: Port[];
  expanded: boolean;
}

const STORAGE_KEY = 'bwfish:nav:expanded';
const NODES_CACHE_KEY = 'bwfish:nav:nodes';

@Injectable({ providedIn: 'root' })
export class NavService {
  private regionService = inject(RegionService);
  private portService = inject(PortService);

  nodes = signal<RegionNode[]>([]);
  loaded = signal(false);
  error = signal<string | null>(null);

  async load() {
    if (this.loaded() && this.nodes().length > 0) return;

    const saved = this.readExpanded();
    const cachedNodes = this.readCachedNodes(saved);

    if (cachedNodes.length > 0) {
      this.nodes.set(cachedNodes);
      this.loaded.set(true);
    }

    try {
      const regions = await this.regionService.getAll();

      const nodes = await Promise.all(
        regions.map(async (region) => {
          const ports = await this.portService.getByRegion(region.id);
          ports.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          return { region, ports, expanded: saved.includes(region.id) };
        })
      );

      this.nodes.set(nodes);
      localStorage.setItem(NODES_CACHE_KEY, JSON.stringify(nodes));
      this.loaded.set(true);
      this.error.set(null);
    } catch (e: any) {
      if (this.nodes().length === 0) {
        this.error.set(e?.message ?? 'Failed to load navigation');
      }
    }
  }

  toggle(regionId: string) {
    this.nodes.update(nodes =>
      nodes.map(n =>
        n.region.id === regionId ? { ...n, expanded: !n.expanded } : n
      )
    );
    const expanded = this.nodes().filter(n => n.expanded).map(n => n.region.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
    localStorage.setItem(NODES_CACHE_KEY, JSON.stringify(this.nodes()));
  }

  private readExpanded(): string[] {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as string[]) : [];
    } catch {
      return [];
    }
  }

  private readCachedNodes(expanded: string[]): RegionNode[] {
    try {
      const value = localStorage.getItem(NODES_CACHE_KEY);
      if (!value) return [];

      const cached = JSON.parse(value) as RegionNode[];
      return cached.map(node => ({
        ...node,
        expanded: expanded.includes(node.region.id),
      }));
    } catch {
      return [];
    }
  }
}
