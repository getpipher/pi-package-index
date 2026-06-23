import { NextResponse } from "next/server";
import { getIndex } from "@/lib/data";
import { searchPackages } from "@/lib/search";
import { RESOURCE_TYPES, type ResourceType } from "@/lib/types";

// Full-text README search (#4). Query-driven; the flexsearch index is built
// once per cold start (module singleton in src/lib/search.ts).
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // README search results are stable for hours; cache at the edge to keep
  // cold starts (which build the in-memory flexsearch index) rare.
  "Cache-Control": "public, max-age=1800, s-maxage=3600",
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseNum(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json(
      { generatedAt: getIndex().generatedAt, count: 0, filtered: 0, packages: [] },
      { headers: CORS_HEADERS },
    );
  }

  const types = parseList(sp.get("types")).filter((t): t is ResourceType =>
    (RESOURCE_TYPES as string[]).includes(t),
  );
  const categories = parseList(sp.get("cat"));
  const minDownloads = parseNum(sp.get("mindl"));
  const minStars = parseNum(sp.get("minst"));
  const maintained = sp.get("mnt") === "1" || sp.get("maintained") === "true";
  const limit = Math.min(200, Math.max(1, parseNum(sp.get("limit")) ?? 50));

  const { packages, total } = searchPackages(q, {
    types: types.length ? types : undefined,
    categories: categories.length ? categories : undefined,
    minDownloads,
    minStars,
    maintained,
  }, limit);

  return NextResponse.json(
    {
      generatedAt: getIndex().generatedAt,
      count: packages.length,
      filtered: total,
      packages,
    },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}