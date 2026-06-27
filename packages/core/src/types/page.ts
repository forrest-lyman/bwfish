export type Collection = "fish" | "techniques" | "regions" | "ports" | "spots";

export interface Page {
  id: string;
  collection: Collection;
  body: string;
  version: string;
}
