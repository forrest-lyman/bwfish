import type { Position } from "./position.js";

export interface Port {
  id: string;
  title: string;
  summary: string;
  regionId: string;
  displayOrder: number;
  fishIds: string[];
  position: Position;
  zoom: number;
  version: string;
}
