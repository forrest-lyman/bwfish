export interface Contributor {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

const contributors: Contributor[] = [];

export function getContributors(): Contributor[] {
  return contributors;
}

export function addContributor(contributor: Contributor): void {
  contributors.push(contributor);
}

export function findContributorById(id: string): Contributor | undefined {
  return contributors.find((c) => c.id === id);
}
