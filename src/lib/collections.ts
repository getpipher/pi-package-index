import { getIndex } from "./data";
import type { Package } from "./types";
import collectionsData from "../../data/collections.json";

export interface Collection {
  slug: string;
  title: string;
  description: string;
  /** Auto-seed: include every package tagged with this category. */
  category?: string;
  /** Explicit curated list: package names (in display order). */
  packages?: string[];
}

const collections = collectionsData as Collection[];

export function getCollections(): Collection[] {
  return collections;
}

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

/** Resolve a collection to its package list (sorted by downloads for auto-seed). */
export function resolveCollectionPackages(collection: Collection): Package[] {
  const all = getIndex().packages;
  if (collection.packages && collection.packages.length > 0) {
    const byName = new Map(all.map((p) => [p.name, p]));
    return collection.packages
      .map((n) => byName.get(n))
      .filter((p): p is Package => p !== undefined);
  }
  if (collection.category) {
    return all
      .filter((p) => p.categories.includes(collection.category!))
      .sort((a, b) => b.downloadsMonth - a.downloadsMonth || (b.stars ?? 0) - (a.stars ?? 0));
  }
  return [];
}