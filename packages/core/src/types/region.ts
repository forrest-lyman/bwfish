import type { Position } from "./position.js";

export interface Region {
  id: string;
  title: string;
  order: number;
  displayOrder: number;
  summary: string;
  position: Position;
  zoom: number;
  fishIds: string[];
  version: string;
}
