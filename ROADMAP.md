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

## Phase 2 — Plugin-hub experience (make `pi-package.rectorspace.com` feel like a polished marketplace, à la claudepluginhub.com)

**Direction:** Phase 1 shipped a *data explorer* (rich, accurate, fast). Phase 2 turns it into a *plugin marketplace hub* — the thing a new visitor lands on and immediately wants to browse/submit/install from. Reference: `https://www.claudepluginhub.com/`.

> ⚠️ **Reference not auto-scraped** (2026-07-04): the live site is behind a Cloudflare managed-challenge and the Wayback availability API 429'd, so the feature list below is derived from the general shape of plugin/marketplace hubs + what's *missing* from our shipped Phase 1 — **confirm against the live reference before locking scope** (open it in a browser, screenshot the nav + homepage + a detail page, then reprioritize). Candidate gaps relative to current state: no marketing landing (homepage = explorer table), no card grid / logos, no submit flow, no author pages, no ratings.

Proposed order (revisit after the reference audit): **#9 → #11 → #10 → #12 → #14 → (#13 gated)**.

### #9 — Marketing landing page (`/`)  · effort: med  · 🔜
**Goal:** replace the homepage-as-explorer-table with a real hub landing: hero (value prop + primary search), "Featured / Editor's picks", "Trending this week" (by 12-wk downloads delta), "Newly published" (from #7 feed data), "Browse by use case" (collections from #3 as cards). Keep `/explore` (or `?view=table`) as the power-user explorer.
**Files:** new `src/app/(landing)/page.tsx` (or move explorer to `/explore`), section components (`FeaturedGrid`, `TrendingRow`, `UseCaseCards`), reuse `data/collections.json` + `/api/packages`.
**Deps:** none new (Tailwind already in). Needs #10 (featured flag) to populate "Editor's picks", or seed manually in `data/featured.json`.
**Edge cases:** empty/unknown featured slug → skip card; trending delta ties → secondary sort by downloads; SEO — landing must still be SSR with proper OG/Twitter cards.
**Gate:** `/` reads as a marketplace landing, not a table; typecheck + lint + build; Lighthouse SEO ≥ 90; mobile hero legible.

### #11 — Marketplace visual polish (card grid + per-package identity)  · effort: med  · 🔜
**Goal:** a card-first browse mode alongside the table: each card shows package identity (name, one-line tagline, author, type badge, mini sparkline from #6, star count). Consistent spacing, dark-mode-first, Lucide icons (never Unicode emojis). Unify row + card styling so collections/landing/author pages share one `PackageCard`.
**Files:** `src/components/PackageCard.tsx`, restyle `PackageRow.tsx` to share primitives, toggle in `FilterState` (`view=grid|table`, URL-synced).
**Edge cases:** very long names/taglines → truncate with `title`; missing sparkline data → hide the mini-chart; a11y — cards are `<article>` with a clear link affordance.
**Gate:** grid + table both render from the same data; typecheck + lint + build; visual diff vs current table doesn't regress the explorer filters.

### #10 — Submit-a-package + editor's picks  · effort: med  · 🔜
**Goal:** (a) a `/submit` form that files a GitHub issue (or PR to a `data/submissions.json`) with package name + notes, so the community can suggest additions; (b) `data/featured.json` of editor's-pick slugs + short blurbs consumed by #9. Keeps curation human-gated (no auto-accept) to avoid spam/quality drift.
**Files:** `src/app/submit/page.tsx`, `data/featured.json`, a tiny server action or GitHub-issue POST (token via Vercel env, server-only).
**Deps:** GitHub token (Vercel env var, never client-exposed) for the issue-creation path; `data/featured.json` schema: `{slug, package, blurb, section}`.
**Edge cases:** duplicate submission → dedupe by name (check open issues + index); rate-limit/abuse → honeypot + Cloudflare Turnstile if it becomes a problem; invalid package name → client-side npm-name regex + server re-check before filing.
**Gate:** `/submit` with a valid new name files exactly one issue; invalid/duplicate names are rejected with a clear message; `featured.json` drives the landing "Editor's picks".

### #12 — Author/maintainer pages (`/u/[name]`)  · effort: low–med  · 🔜
**Goal:** browse packages by npm maintainer (derived from the packument `maintainers[].username`). Links from detail pages + cards. Differentiator the official gallery lacks.
**Files:** `src/app/u/[name]/page.tsx`, reuse `PackageCard`; add a `maintainers` index at build time (the pipeline already resolves packuments — extract + store a small `{username: [names]}` map, or filter `packages.json` at request time).
**Edge cases:** maintainer renames/departures → the field is point-in-time at refresh; collisions with package names under `/u/` vs `/p/` → distinct route prefixes avoid it; empty maintainer list → friendly empty state.
**Gate:** `/u/<someone>` lists their packages; detail pages link to author; typecheck + lint + build.

### #14 — Per-package logo / repo social preview  · effort: med  · 🔜 (after #11)
**Goal:** card identity is much more compelling with a real icon — pull the GitHub repo's social preview image (or npm/owner avatar) as the card thumbnail; graceful fallback to a generated monogram.
**Files:** pipeline step to fetch + cache images locally (`data/.cache/avatars`, 7-day TTL), `src/components/PackageLogo.tsx`, monogram fallback generator.
**Edge cases:** many repos have no social preview → most cards fall back anyway; image hotlinking/404s → must proxy/cache locally to avoid broken images and respect upstream bandwidth; CSP for remote images.
**Gate:** detail + cards render a logo with monogram fallback; no broken-image icons on cold cache; typecheck + lint + build.

### #13 — Ratings / reviews (community)  · effort: high  · 🚧 GATED
**Goal:** star ratings + short reviews per package — the headline "hub" social feature.
**Gate (hard):** requires auth (GitHub OAuth via NextAuth/Auth.js), a database (Vercel Postgres / Turso / Cloudflare D1), spam moderation, and ToS/abuse handling. **Do not start** until Phase 2 core (#9–#12) lands and traffic justifies the ops surface. Consider a lighter v0: "GitHub reactions mirror" (count 👍 on the package's repo issue/README) to get a signal without auth/DB.

---

## Execution rules
- One commit per issue (feature), conventional `feat(#n): …`. Push → git→Vercel auto-deploys.
- Each issue: PLAN-style gate (typecheck + lint + build + manual verify) before claiming done.
- Update this file (check the item) + close the issue when shipped.
- Defer the heavy ones (#4, #6, #5) to their own focused sessions; ship #1 + #7 first.