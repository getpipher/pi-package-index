import { NextResponse } from "next/server";
import { getIndex } from "@/lib/data";
import { filterPackages, paginate, clampPerPage } from "@/lib/filter";
import { RESOURCE_TYPES, type ResourceType, type SortKey } from "@/lib/types";

// Query-param-driven: render on every request (stateless serverless).
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=3600, s-maxage=21600",
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNum(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;

  const types = parseList(sp.get("types")).filter((t): t is ResourceType =>
    (RESOURCE_TYPES as string[]).includes(t),
  );
  const categories = parseList(sp.get("cat"));
  const minDownloads = parseNum(sp.get("mindl"));
  const minStars = parseNum(sp.get("minst"));
  const maintained = sp.get("mnt") === "1" || sp.get("maintained") === "true";
  const sort = (sp.get("sort") as SortKey | null) ?? "downloads";
  const page = Math.max(1, parseNum(sp.get("page")) ?? 1);
  const perPage = clampPerPage(parseNum(sp.get("perPage")) ?? 50, 50, 100);

  const index = getIndex();
  const filtered = filterPackages(index.packages, {
    q: sp.get("q") ?? undefined,
    types: types.length ? types : undefined,
    categories: categories.length ? categories : undefined,
    minDownloads,
    minStars,
    maintained,
    sort,
  });

  const result = paginate(filtered, page, perPage);

  return NextResponse.json(
    {
      generatedAt: index.generatedAt,
      count: index.count,
      filtered: filtered.length,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
      packages: result.items,
    },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}