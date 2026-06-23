import type { Package, ResourceType, SortKey } from "./types";

export interface ApiResponse {
  generatedAt: string;
  count: number;
  filtered: number;
  page: number;
  perPage: number;
  totalPages: number;
  packages: Package[];
}

export interface FilterState {
  q: string;
  types: ResourceType[];
  categories: string[];
  minDownloads: number | null;
  minStars: number | null;
  maintained: boolean;
  sort: SortKey;
}

/** Build the shared filter query params (used for both the URL and the API). */
export function filterParams(s: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.types.length) p.set("types", s.types.join(","));
  if (s.categories.length) p.set("cat", s.categories.join(","));
  if (s.minDownloads !== null) p.set("mindl", String(s.minDownloads));
  if (s.minStars !== null) p.set("minst", String(s.minStars));
  if (s.maintained) p.set("mnt", "1");
  if (s.sort !== "downloads") p.set("sort", s.sort);
  return p;
}

export function buildQuery(s: FilterState, page: number, perPage = 100): URLSearchParams {
  const p = filterParams(s);
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  return p;
}

export async function fetchPackages(
  s: FilterState,
  page: number,
  perPage = 100,
): Promise<ApiResponse> {
  const qs = buildQuery(s, page, perPage).toString();
  const url = qs ? `/api/packages?${qs}` : "/api/packages";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API responded ${res.status} ${res.statusText}`);
  return (await res.json()) as ApiResponse;
}