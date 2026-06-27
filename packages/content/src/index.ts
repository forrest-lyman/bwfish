export interface ContentItem {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
}

const items: ContentItem[] = [];

export function getContentItems(): ContentItem[] {
  return items;
}

export function addContentItem(item: ContentItem): void {
  items.push(item);
}
