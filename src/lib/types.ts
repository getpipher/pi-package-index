export type ResourceType = "extension" | "skill" | "prompt" | "theme";

export type SortKey = "downloads" | "stars" | "recent" | "name";

export interface Package {
  /** npm name, e.g. "@hypabolic/pi-hypa" */
  name: string;
  description: string;
  /** npm author or maintainer handle */
  author: string | null;
  /** detected resource types (heuristic from name + description in v1) */
  types: ResourceType[];
  /** auto-tagged categories: mcp, solana, web, browser, memory, ... */
  categories: string[];
  npmUrl: string;
  /** resolved GitHub URL from the npm repository field, if any */
  repoUrl: string | null;
  repoOwner: string | null;
  repoName: string | null;
  version: string;
  /** last publish (ISO) */
  publishedAt: string;
  /** npm downloads in the last month */
  downloadsMonth: number;
  /** GitHub stargazers_count (null when no repo / not fetched) */
  stars: number | null;
  /** GitHub pushed_at (ISO) */
  lastPush: string | null;
  openIssues: number | null;
  archived: boolean | null;
  /** derived: pushed within 180 days AND not archived */
  maintained: boolean;
  /** ready-to-copy install command */
  install: string;
}

export interface IndexData {
  /** ISO timestamp the index was generated */
  generatedAt: string;
  count: number;
  packages: Package[];
}

export interface FilterParams {
  q?: string;
  types?: ResourceType[];
  categories?: string[];
  minDownloads?: number;
  minStars?: number;
  maintained?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export const ALL_CATEGORIES = [
  "mcp",
  "solana",
  "web",
  "browser",
  "memory",
  "context",
  "subagent",
  "vision",
  "git",
  "plan",
  "theme",
  "prompt",
  "skill",
  "linter",
  "security",
] as const;

export const RESOURCE_TYPES: ResourceType[] = [
  "extension",
  "skill",
  "prompt",
  "theme",
];