# ROADMAP — post-v1 implementation

Tracks issues #1–#8 (see `SPEC.md` §10). Each item: goal, approach, data/API impact, deps, effort, edge cases. Execute in the order below unless RECTOR redirects.

Locked order: **#1 → #7 → #3 → #4 → #2 → #6 → #5 → #8**.

## Cross-cutting decisions (apply across items)
- **Detail-page README is untrusted 3rd-party content** from arbitrary npm packages → must be sanitized before render. Use `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize` (allowlist). Never `dangerouslySetInnerHTML`.
- **README source = npm packument `readme` field, fetched on-demand** (not stored in `data/packages.json`). Storing 4,300 READMEs (~40 MB+) would bloat the index; fetching per-detail-view (cached) keeps the bundle small. The `readme` field is **mixed format**: markdown (`# heading`) **or** HTML (`<p>…`) — render markdown, allow+sanitize embedded HTML.
- **Scoped names** (`@scope/pkg`) contain a `/` → detail routes use a **catch-all** `[...name]`, rejoining segments with `/`.
- **Build-time vs runtime data:** package *meta* (name/desc/stats) is build-time (bundled JSON, refreshes daily via cron+deploy). Per-package *rich* content (README, trend, security) is fetched at request time (cached) — don't bloat the index.

---

## #1 — Package detail pages (`/p/[name]`)  · effort: med  ✅ SHIPPED (91d67af)
**Goal:** on-site detail page per package: full meta, rendered (sanitized) README, install command, all stats, links. Table rows link in-site instead of to npm.
**Files:** `src/app/p/[...name]/page.tsx` (dynamic, fetches packument README, `revalidate: 3600`), `src/components/PackageRow.tsx` (name link → `/p/<name>`), maybe `src/components/Readme.tsx`.
**Deps:** `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`.
**Edge cases:** missing README → fallback note + link to npm/repo; relative image URLs in README → broken (rewrite to GitHub raw in v1.1); 404 unknown name → `notFound()`; packument fetch fail → degrade gracefully (show meta without README).
**Gate:** typecheck + lint + build; `/p/<scoped/name>` renders; untrusted README sanitized (no raw script/style).

## #7 — RSS/Atom feed (`/feed.xml`, `/feed.json`)  · effort: low  ✅ SHIPPED (e6babf7)
**Goal:** feed of newly-published + recently-pushed packages for "what's new in Pi packages".
**Files:** `src/app/feed.xml/route.ts`, `src/app/feed.json/route.ts` — read bundled index, sort by `publishedAt`/`lastPush`, slice top 50, emit RSS 2.0 + JSON Feed 1.1. `Cache-Control: public, max-age=3600`. Add `<link rel="alternate">` in layout head.
**Gate:** `curl /feed.xml` validates as RSS 2.0; `/feed.json` validates as JSON Feed.

## #3 — Curated collections (`/collections/[slug]`)  · effort: med  ✅ SHIPPED (6ef3f15)
**Goal:** human-curated + auto-seeded collections: "Best for Solana devs", "MCP adapters", "Context-savers", "Browser automation", "Vision". Key differentiator vs the official gallery.
**Files:** `data/collections.json` (curated: slug, title, description, package names, optional category auto-seed rule), `src/app/collections/[slug]/page.tsx`, index list at `/collections`, nav link.
**Data:** curated by RECTOR (seed a few); auto-seed by category from the index. Keep `data/collections.json` committed (small).
**Gate:** `/collections` lists collections; `/collections/mcp-adapters` renders matching packages.

## #4 — Full-text README search  · effort: high  ✅ SHIPPED (8a1d586)
**Goal:** search over READMEs (not just name/desc) for deeper discovery.
**Shipped approach:** server-side `/api/search` route backed by a flexsearch `Document` index (module singleton, built once per cold start ~0.9s, warm ~4ms, edge-cached `s-maxage=3600`). Indexes **name + categories + description + README** with weights (name > categories > description > readme); per-field results merged with a position decay, then type/category/maintained/min filters applied. Categories were added to the index so tag-style queries like `solana` match tagged packages even when the word is absent from name/desc/readme (the literal ROADMAP gate).
**Pipeline:** `pipeline/readmes.ts` (weekly `refresh-search.yml` cron, Mondays 05:00 UTC) fetches each packument README, strips HTML/markdown-links/bare-URLs, truncates to 800 chars, writes `data/readmes.json` (~3.2 MB, flat `{name: text}`). Lone UTF-16 surrogates are stripped so strict JSON parsers (Turbopack/SWC) accept the file. Reuses the existing rate limiter / pool / disk cache (`data/.cache/readmes`, 7-day TTL).
**Client:** `FilterState.deep` flag (URL `deep=1`); a "⌕ READMEs" toggle in the filter bar; Explorer branches to `/api/search` (ranked top 100, no pagination) when deep + a query is active. `data/readmes.json` is a **server-only** build-time import — never copied to `public/`, never shipped to the client.
**Decisions / gotchas:** (1) `flexsearch` was already a dependency (pre-staged) — used it over MiniSearch. (2) The `export()` API is fiddly/streaming, so the index is rebuilt at cold start from the committed corpus rather than serialized. (3) Committing ~3.2 MB weekly grows git, but READMEs change slowly so delta storage keeps diffs small (ROADMAP sanctioned committing `readmes.min.json`). (4) A weekly cron is unavoidable here — unlike #6, full-text search has no on-demand option; the corpus must exist prebuilt. (5) Turbopack rejects lone-surrogate `\uDXXX` escapes that V8 accepts — must strip them.
**Gate:** ✅ `/api/search?q=solana` returns 18 ranked matches; `q=memory`/`q=mcp`/`q=context`/prefix (`mem`)/multi-word (`context window`) all return relevant ranked results; typecheck + lint + build green; live deploy verified.

## #2 — Side-by-side compare  · effort: med  ✅ SHIPPED (b43c5c9)
**Goal:** pick 2–4 packages (via query params), compare downloads/stars/maintenance/desc/types side-by-side. Shareable URL.
**Files:** `src/app/compare/page.tsx` (reads `?p=name1&name2&…`), a compare table component. Link from detail pages ("compare").
**Gate:** `/compare?p=a&p=b` renders a comparison; handles missing names.

## #6 — Download trend sparklines (12-week)  · effort: med  ✅ SHIPPED (44e0834)
**Goal:** 12-week download history per package as an inline sparkline (rows + detail).
**Shipped approach:** on-demand fetch in the detail page (RSC) via `src/lib/trends.ts` — `fetchDownloadRange` hits `api.npmjs.org/downloads/range/YYYY-MM-DD:YYYY-MM-DD/<name>` (last 90 days, daily) with `next: { revalidate: 604800 }` (7-day ISR), then `toWeeklyBuckets` downsamples the last 84 days to 12 weekly totals. `src/components/Sparkline.tsx` renders an inline SVG (area + line); all-zero / 404 / empty series degrade to a dashed baseline + "No downloads in the last 12 weeks." caption.
**Deviation from original plan:** on-demand + ISR instead of a weekly `refresh-trends.yml` cron + bundled `data/trends.min.json`. Rationale: matches the shipped #5 (README/quality) on-demand pattern; avoids a ~4,300-pkg/week crawl and a ~1.3 MB server bundle; the 7-day revalidate still satisfies "trends refresh weekly." Rows intentionally skipped (gate says "optionally rows") to keep the home bundle lean — revisit if rows need sparklines (would require bundling).
**Gotcha fixed:** the npm range API does NOT accept a `last-90-days` keyword (only `last-day`/`last-week`/`last-month` or explicit `YYYY-MM-DD:YYYY-MM-DD`) — the keyword silently returns a bogus 1-day/zero result. Always compute an explicit date range. Scoped names encoded as `@`→`%40`, `/` literal.
**Gate:** ✅ sparkline renders on detail for data + no-data packages; typecheck + lint + build green; trends refresh weekly via 7-day ISR.

## #5 — Security & quality signals  · effort: high → done light (on-demand)  ✅ SHIPPED (23416ed)
**Goal:** per-package: has tests, has README, license, bundled vs peer deps, install size, `pi` manifest validation, archived. Surface as badges on rows + detail.
**Files:** pipeline fetches packument (we already resolve repo; add `license`, `files`, `dependencies`, `peerDependencies`, `pi` manifest, `dist.unpackedSize`), derive signals, store in index (small fields). Render badges.
**Data:** adds packument fetch for every package at refresh (4,300 calls) — heavy. Gate behind weekly or reuse the on-demand detail-page packument fetch (cache) rather than storing all. Recommend: compute on-demand at detail-page time (reuse packument fetch), not in the bulk index.
**Gate:** badges render on detail; license/has-tests/archived accurate.

## #8 — Upstream donation: PR stars/filters/API to earendil-works/pi  · effort: coordination  ✅ SHIPPED (proposal issue posted)
**Goal:** offer our stars + filter + public-API features back to the official gallery as a PR; frame as companion not competitor.
**Outcome:** posted as `earendil-works/pi#6027` — https://github.com/earendil-works/pi/issues/6027 (issue, `to-discuss` intended — external contributors can't set labels, maintainers can). Draft + investigation notes in `~/Documents/secret/claude-strategy/pi-package-index/upstream-proposal-draft.md`.
**Investigation:** the official gallery `pi.dev/packages` ("Package Catalog · Pi") is a client-side page fetching the npm registry directly; it lacks GitHub stars, maintenance badge, topic categories, and a public API. Its source repo `earendil-works/pi-website` is **archived**, so a code PR wasn't viable — the contribution became a proposal issue on the active `earendil-works/pi` repo (discussions + issues enabled, `to-discuss` culture). The proposal offers, in increasing involvement: (1) consume our `/api/packages` + `/api/search` as enrichment/fallback, (2) adopt the ~500-line enrichment pipeline, (3) cross-link — framed as a companion, MIT-licensed, with our live index as a working reference.
**Gate:** ✅ documented proposal issue on their repo posted (#6027). Note: their bot auto-closes all new-contributor issues by policy (maintainers reopen worthwhile ones daily); #6027 is auto-closed/`untriaged`, left as-is per CONTRIBUTING. Outcome depends on maintainer triage; revisit only if they engage.

---

## Execution rules
- One commit per issue (feature), conventional `feat(#n): …`. Push → git→Vercel auto-deploys.
- Each issue: PLAN-style gate (typecheck + lint + build + manual verify) before claiming done.
- Update this file (check the item) + close the issue when shipped.
- Defer the heavy ones (#4, #6, #5) to their own focused sessions; ship #1 + #7 first.