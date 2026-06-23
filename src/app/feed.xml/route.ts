import { getIndex } from "@/lib/data";
import type { Package } from "@/lib/types";

const SITE = "https://pi-package.rectorspace.com";

// Feeds are baked at build time (force-static); they refresh with each daily
// cron-triggered redeploy, so no per-request serverless cost.
export const dynamic = "force-static";

function freshness(p: Package): number {
  const t = Date.parse(p.lastPush ?? p.publishedAt);
  return Number.isNaN(t) ? 0 : t;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const index = getIndex();
  const items = [...index.packages].sort((a, b) => freshness(b) - freshness(a)).slice(0, 50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pi Package Index — new &amp; recently-pushed</title>
    <link>${SITE}</link>
    <description>Unofficial community index of Pi coding-agent packages. Newest and recently-pushed entries.</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map(
    (p) => `    <item>
      <title>${esc(p.name)}</title>
      <link>${SITE}/p/${encodeURIComponent(p.name)}</link>
      <guid isPermaLink="true">${SITE}/p/${encodeURIComponent(p.name)}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${new Date(p.lastPush ?? p.publishedAt).toUTCString()}</pubDate>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}