import type { Position } from "./position.js";

export type SpotType =
  | "bar"
  | "bank"
  | "channel"
  | "flat"
  | "ledge"
  | "point"
  | "reef"
  | "shoal"
  | "wreck"
  | (string & {});

export interface Spot {
  id: string;
  title: string;
  summary: string;
  spotType: SpotType;
  regionId: string;
  portIds: string[];
  fishIds: string[];
  position: Position;
  zoom: number;
  version: string;
}
