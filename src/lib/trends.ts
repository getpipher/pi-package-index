// Download-trend fetching for package detail pages.
//
// Uses the npm downloads/range API with an explicit date range (last 90 days,
// daily) fetched on-demand per detail view with a 7-day ISR revalidate —
// same pattern as the README packument fetch. This avoids a weekly bulk crawl
// of ~4,300 packages and keeps the trend data out of the client bundle.
// See ROADMAP #6.
//
// NOTE: the range API does NOT accept a `last-90-days` keyword (only
// `last-day`/`last-week`/`last-month` or `YYYY-MM-DD:YYYY-MM-DD`). The keyword
// silently returns a bogus 1-day/zero result, so we always compute an explicit
// date range from "today minus 90 days" to "today".

const NPM_DOWNLOADS_RANGE = "https://api.npmjs.org/downloads/range";

interface RangeResponse {
  start: string;
  end: string;
  package: string;
  downloads: Array<{ day: string; downloads: number }>;
}

/** Encode a (possibly scoped) npm name for the downloads range API: `@`→`%40`, `/` left literal. */
function encodeName(name: string): string {
  return encodeURIComponent(name).replace("%2F", "/");
}

/** `YYYY-MM-DD` in UTC for a Date offset by `days` from today. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Last 90 days of daily download counts for a package.
 * Returns `[]` on any failure so callers render a graceful "no data" state.
 */
export async function fetchDownloadRange(name: string): Promise<number[]> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    const range = `${isoDay(start)}:${isoDay(end)}`;
    const res = await fetch(`${NPM_DOWNLOADS_RANGE}/${range}/${encodeName(name)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604800 }, // 7 days — trends refresh weekly
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RangeResponse;
    if (!Array.isArray(data.downloads)) return [];
    return data.downloads.map((d) => d.downloads);
  } catch {
    return [];
  }
}

/**
 * Downsample a daily series (last 90 days) into 12 weekly buckets of total
 * downloads, aligned to the most recent 84 days. Returns up to 12 numbers;
 * shorter input yields fewer buckets. An empty/short input returns `[]`.
 */
export function toWeeklyBuckets(daily: number[]): number[] {
  if (daily.length === 0) return [];
  const recent = daily.slice(-84);
  const buckets: number[] = [];
  for (let i = 0; i < recent.length; i += 7) {
    buckets.push(recent.slice(i, i + 7).reduce((a, b) => a + b, 0));
  }
  return buckets;
}