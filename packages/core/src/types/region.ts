import type { Position } from "./position.js";

export interface Region {
  id: string;
  title: string;
  summary: string;
  position: Position;
  zoom: number;
  fishIds: string[];
  version: string;
}
