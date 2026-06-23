import { getIndex } from "@/lib/data";
import type { Package } from "@/lib/types";

const SITE = "https://pi-package.rectorspace.com";

export const dynamic = "force-static";

function freshness(p: Package): number {
  const t = Date.parse(p.lastPush ?? p.publishedAt);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET(): Promise<Response> {
  const index = getIndex();
  const items = [...index.packages]
    .sort((a, b) => freshness(b) - freshness(a))
    .slice(0, 50)
    .map((p) => ({
      id: `${SITE}/p/${encodeURIComponent(p.name)}`,
      url: `${SITE}/p/${encodeURIComponent(p.name)}`,
      title: p.name,
      content_text: p.description || "",
      date_published: p.lastPush ?? p.publishedAt ?? undefined,
      external_url: p.repoUrl ?? p.npmUrl,
      tags: p.categories,
    }));

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Pi Package Index — new & recently-pushed",
    home_page_url: SITE,
    feed_url: `${SITE}/feed.json`,
    description:
      "Unofficial community index of Pi coding-agent packages. Newest and recently-pushed entries.",
    language: "en",
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "content-type": "application/feed+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}