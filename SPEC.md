# SPEC — pi-package.rectorspace.com

> Unofficial community index of **Pi coding-agent** packages, ranked by real signals (downloads + GitHub stars + maintenance health), with filterable search and a public JSON API.
>
> **Not affiliated with earendil-works.** A companion to the official gallery at [pi.dev/packages](https://pi.dev/packages), not a replacement.

**Status:** Draft v1 (2026-06-23) · **Owner:** RECTOR · **Org:** `getpipher`

---

## 1. Problem & Opportunity

The official [pi.dev/packages](https://pi.dev/packages) gallery lists ~4,300 packages (npm packages tagged `pi-package`) but has clear gaps:

| pi.dev/packages has | Gap this project fills |
|---|---|
| downloads/mo | **No GitHub stars** — no "community love" signal |
| "age" only | **No maintenance health** — last push, open issues, archived flag |
| basic text search + type filter | **No category filter, no min-downloads/stars, no maintained-only** |
| `pi.dev/api/packages` → **HTTP 501 (not implemented)** | **No real public API** |
| flat list | **No curated collections / shortlists** |

**Opportunity:** a lean, fast, community-owned index that makes Pi packages triageable by the signals that matter, and exposes a real API the official gallery lacks.

## 2. Goals & Non-Goals

### Goals (v1)
- Index **all** npm packages with keyword `pi-package` (~4,300).
- Enrich each with: npm downloads/mo, GitHub stars, last push, open issues, archived flag, "maintained" badge.
- Ranked, searchable, filterable UI: type, category, min-downloads, min-stars, maintained-only; sort by downloads / stars / recent.
- **Public JSON API** `/api/packages` (paginated, filterable) — fills the 501 gap.
- Daily automated refresh via GitHub Actions cron; static deploy on Vercel (hobby plan).
- Live at `https://pi-package.rectorspace.com`.

### Non-Goals (v1)
- No user accounts, no auth, no favorites, no reviews.
- No package detail pages (v1.1).
- No full-text README search (v1.1).
- No security/code-analysis signals (v1.1).
- No replacement for `pi install` — always link the install command, never execute it.

### Post-v1 (filed as issues, see §10)
Package detail pages · side-by-side compare · curated collections · README full-text search · security signals (tests/README/license/bundled-deps) · trend sparklines · RSS/Atom feed of new packages · upstream PR to `earendil-works/pi` donating stars/filter features.

## 3. Positioning & Brand

- **Unofficial community companion** to the official gallery — extend, don't cannibalize.
- Prominent disclaimer on every page footer + About: *"Not affiliated with or endorsed by earendil-works. Data sourced from npm and GitHub."*
- Link back to the official gallery on package rows and the About page.
- Dark, developer-centric theme (Tailwind); Lucide icons; no Unicode emoji as icons.
- Domain: `pi-package.rectorspace.com` (RECTOR's personal CF account).

## 4. Architecture

**No dedicated backend. No database.**

```
 ┌─────────────────────────── DATA PIPELINE (GitHub Actions, daily cron) ───────────────────────────┐
 │  npm registry search (keywords:pi-package, 250/page)  ──► all package names + meta + repo URLs   │
 │  npm downloads API (point/last-month)                ──► downloads/mo per package                │
 │  GitHub REST (repos/{o}/{r}) via GITHUB_TOKEN        ──► stars, last push, issues, archived       │
 │  ──► normalize + tag categories ──► data/packages.json + data/packages.min.json                   │
 │  ──► git commit to main (only on diff) ──► push                                                      │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │ push to main
                                              ▼
 ┌───────────────────────────── APP (Next.js, Vercel hobby) ──────────────────────────────────────┐
 │  SSG build from data/packages.json                                                               │
 │  /                ranked table; Explorer fetches filtered pages from /api/packages │
 │  /api/packages    stateless serverless route → reads bundled JSON, paginates/filters server-side │
 │  /about           data sources, refresh cadence, disclaimer                                       │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why no BE / no DB
- Data changes daily — a daily cron commit is fresh enough; no live DB needed.
- ~4,300 rows / ~1–2 MB JSON — client-side search/filter is trivial; the API route reads bundled JSON for raw consumers.
- Hobby plan — static + one serverless route fits free tier; a DB adds cost + ops for zero v1 benefit.
- Credentials stay in CI (the pipeline runs in GH Actions with the auto-provided `GITHUB_TOKEN`).

## 5. Data Model

`data/packages.json` — `{ "generatedAt": ISO, "count": N, "packages": [Package] }`

```ts
interface Package {
  name: string;                  // npm name, e.g. "@hypabolic/pi-hypa"
  description: string;
  author: string | null;         // npm author or maintainer handle
  type: ResourceType[];          // ["extension"] | ["skill","theme"] ... from `pi` manifest / conventional dirs
  categories: string[];          // auto-tagged: ["mcp","context","solana", ...]
  npmUrl: string;                // https://www.npmjs.com/package/<name>
  repoUrl: string | null;        // resolved GitHub URL from repository field
  repoOwner: string | null;
  repoName: string | null;
  version: string;
  publishedAt: string;           // last publish (ISO)
  downloadsMonth: number;        // npm downloads, last month
  stars: number | null;          // GitHub stargazers_count (null if no repo)
  lastPush: string | null;       // GitHub pushed_at (ISO)
  openIssues: number | null;
  archived: boolean | null;
  maintained: boolean;           // derived: pushed within 180 days AND not archived
  install: string;               // `pi install npm:<name>`
  pi?: {                         // raw `pi` manifest (for resource-type detection)
    extensions?: string[]; skills?: string[]; prompts?: string[]; themes?: string[];
  };
}
```

## 6. Data Pipeline

### Sources
1. **npm registry search** — `https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=250` paginated (from=0,250,500…). Returns name, description, author, version, date, `links.repository`.
2. **npm downloads** — `https://api.npmjs.org/downloads/point/last-month/<name>` per package. No auth; concurrency 10; polite.
3. **npm packument** (only when repo URL missing from search result) — `https://registry.npmjs.org/<name>` → `repository.url`.
4. **GitHub REST** — `GET /repos/{owner}/{repo}` → `stargazers_count`, `pushed_at`, `open_issues_count`, `archived`. Authed via `GITHUB_TOKEN` (5,000/hr).

### Rate limits & reliability
- GitHub: 5,000/hr authed. ~3,000 repo calls per refresh → fits one daily run with headroom. Concurrency 8–10. On 403/secondary-rate, exponential backoff + abort; partial run resumes next day (cache prior results, only refetch missing).
- npm downloads: no documented limit; concurrency 10.
- All results cached to `data/.cache/<source>/<name>.json` (committed-ignore) so partial failures don't lose work and re-runs are cheap.

### Category auto-tagging
Keyword/regex scan over `name + description + pi manifest`: `mcp`, `solana`, `web`, `browser`, `memory`, `context`, `subagent`, `vision`, `git`, `plan`, `todo`, `theme`, `prompt`, `skill`, `linter`, `security`. Open set — configurable in `pipeline/categories.ts`.

### Refresh cadence
- **Daily**, 04:00 UTC, via `schedule: cron: '0 4 * * *'`.
- Manual dispatch via `workflow_dispatch` (for first run + on-demand).
- Pipeline commits `data/packages.json` **only when content changes** (diff check) to avoid empty commits spamming the deploy log.

### Credentials
- `GITHUB_TOKEN` — auto-provided by GH Actions (no manual secret needed for v1). Read public repos cross-org at authed rates.
- **Escalation:** if secondary rate limits bite, add a fine-grained PAT (public-read, no write) as repo secret `PI_PKG_GH_PAT` and prefer it in the pipeline. Tracked as an ops note, not a v1 requirement.

## 7. Features (v1)

### 7.1 Home — ranked package table
- Columns: name (+ install-copy button), description, type badges, author, downloads/mo, stars, last push, maintained badge, links (npm, repo).
- Default sort: downloads/mo desc. Toggle: stars / recent / name.
- Row click → opens npm page (v1) / detail page (v1.1).

### 7.2 Search + filters (server-side, via the public API)
- The `Explorer` fetches filtered/paginated pages from `/api/packages` (debounced, race-safe, load-more) instead of embedding all data — keeps the home HTML ~20 KB flat regardless of index size.
- Free-text search is server-side substring over name + description + author (API `q`).
- _Deviation from the original client-side FlexSearch plan (deferred to issue #4 / full-text README search)._
- Filters: type (multi), category (multi), min downloads, min stars, maintained-only.
- URL-synced query params (shareable filter views).
- Result count + "showing N of 4,303".

### 7.3 Public JSON API — `/api/packages`
Stateless Next.js route handler reading bundled `data/packages.json`.
- Query params: `q`, `type`, `category`, `minDownloads`, `minStars`, `maintained`, `sort`, `page`, `perPage` (max 100).
- Response: `{ generatedAt, count, page, perPage, packages: [...] }`.
- CORS: `Access-Control-Allow-Origin: *` (public, read-only).
- Cached: `Cache-Control: public, max-age=3600, s-maxage=21600`.
- Also serve raw `data/packages.json` + `data/packages.min.json` as static assets for bulk download.

### 7.4 About page
- Data sources + refresh cadence + how to add a package (tag `pi-package` on npm).
- Disclaimer (not affiliated with earendil-works) + link to official gallery.
- Link to repo + license + the API docs.

## 8. Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19, TypeScript strict.
- **Styling:** Tailwind CSS v4, dark theme.
- **Icons:** Lucide React.
- **Search:** server-side substring via `/api/packages?q=` (FlexSearch client-side deferred to issue #4).
- **Pipeline:** TypeScript scripts in `pipeline/`, run by GH Actions on Node 22.
- **Deploy:** Vercel (hobby), static SSG + one serverless route.
- **Package manager:** pnpm.

## 9. Repo Structure

```
pi-package-index/
├── SPEC.md
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── data/
│   ├── packages.json          # generated (committed by cron)
│   ├── packages.min.json      # generated (committed by cron)
│   └── .cache/                # gitignored pipeline cache
├── pipeline/
│   ├── npm.ts                 # enumerate + downloads
│   ├── github.ts              # stars/maintenance
│   ├── categories.ts          # auto-tagging
│   ├── normalize.ts           # assemble Package records
│   └── run.ts                 # orchestrator (entrypoint)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # home (ranked table + filters)
│   │   ├── about/page.tsx
│   │   └── api/packages/route.ts
│   ├── components/
│   │   ├── PackageTable.tsx
│   │   ├── Filters.tsx
│   │   ├── SearchBar.tsx
│   │   └── ...
│   └── lib/
│       ├── types.ts           # Package interface
│       └── filter.ts          # shared filter/sort logic (FE + API)
└── .github/
    ├── workflows/
    │   ├── refresh.yml        # daily cron pipeline
    │   ├── ci.yml             # build + typecheck + lint
    │   └── mirror-gitlab.yml  # GitLab mirror (secret: GITLAB_SSH_KEY)
```

## 10. Post-v1 Roadmap (filed as GitHub issues)

1. **Package detail pages** (`/p/[name]`) — full metadata, README render, release history, download trend.
2. **Side-by-side compare** — pick 2–4 packages, compare signals + descriptions.
3. **Curated collections** — "Best for Solana devs", "MCP adapters", "Context-savers", "Browser automation", "Vision". Human-curated + auto-seeded.
4. **Full-text README search** — index READMEs (fetched at pipeline time) for deeper discovery.
5. **Security/quality signals** — has tests, has README, license, bundled vs peer deps, install size, `pi` manifest validation.
6. **Trend sparklines** — 12-week download history (npm downloads/range API) per package + on rows.
7. **RSS/Atom feed** — new packages + recently-pushed, for "what's new in Pi packages".
8. **Upstream donation** — PR to `earendil-works/pi` adding stars + filters + API to the official gallery; offer our data/API as a fallback.

## 11. Deployment & DNS

- **First deploy:** `vercel` CLI from repo root → personal account (`rz1989s`), hobby plan. Confirm site live on the generated `*.vercel.app` URL.
- **Git connection (after first live):** connect `getpipher/pi-package-index` in Vercel dashboard → enable `main` → production deploys on push. This unlocks the cron-commits-JSON → auto-deploy loop.
- **DNS:** add CNAME on `rectorspace.com` (personal CF account, zone `3a150ea29cd0cd2c07476dd2cc7b0632`):
  - `pi-package` → `cname.vercel-dns.com`
  - Proxied: **off** (grey-cloud) — Vercel manages the cert via its own ACME; proxied CF can conflict with Vercel's edge. (Per CLAUDE.md, CF Origin CA is for backend services behind CF proxy, not for Vercel.)
  - Then in Vercel: add `pi-package.rectorspace.com` as a production domain; Vercel verifies via the CNAME and issues the cert.
- **CF credentials:** use `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY` (already in env; verified to target the personal account). API edit via `api.cloudflare.com/client/v4/zones/<zone>/dns_records`.

## 12. CI/CD

- **`ci.yml`** — on PR + push to main: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm build`. Fail fast.
- **`refresh.yml`** — daily cron (04:00 UTC) + `workflow_dispatch`: run `pnpm pipeline`, commit `data/packages.json` on diff, push to main (triggers Vercel deploy post-git-connection).
- **`mirror-gitlab.yml`** — force-push `main` to GitLab `getpipher/pi-package-index` (`.github` → `dot-github`). Secret `GITLAB_SSH_KEY` per-repo. **TODO:** create the GitLab repo + set the secret (follow-up, not blocking first deploy).

## 13. Security & Credentials

- **No secrets in client bundle.** The pipeline's GitHub reads happen in CI only; the built site contains only derived public metadata.
- **`GITHUB_TOKEN`** is CI-injected, never written to repo or Vercel.
- **CF API key** — used only locally (this machine) for the one-time DNS edit; never committed, never in Vercel.
- **Vercel** — no env secrets required for v1 (the API route is stateless, reads bundled JSON).
- **Input safety** — all package metadata is sanitized before render (descriptions can contain arbitrary text from npm; escape on render, never `dangerouslySetInnerHTML`).
- **No `pi install` execution** — the install command is displayed as copyable text only.

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Redundant with official gallery (which could add these features) | Differentiate hard (stars + API + filters); frame as companion; donate features upstream (roadmap #8) |
| GitHub secondary rate limits on ~3k calls | Concurrency ≤10, backoff, cache, daily-only cadence; escalate to PAT if needed |
| npm keyword drift (packages mis/un-tagged) | Document the `pi-package` keyword convention; About page explains how to get listed |
| Data freshness expectations | Clearly state "refreshed daily" in UI + API response (`generatedAt`) |
| Name/trademark ("Pi") | "Unofficial / not affiliated" disclaimer everywhere; descriptive fair-use naming |
| Spam/low-quality packages | Maintained badge + min-downloads filter surface quality; no editorial removal (it's an index) |
| Vercel hobby limits | Static + one serverless route is well within hobby; monitor function execution |

## 15. Success Metrics (v1)

- Index covers ≥99% of npm `pi-package` keyword packages.
- Daily refresh runs green ≥6/7 days/week.
- P95 page load < 1.5s on the table view (static, client-filtered).
- `/api/packages` responds < 200ms p95 (reads bundled JSON).
- Public API referenced by at least one third-party (stretch).

## 16. Decisions Log

| Date | Decision |
|---|---|
| 2026-06-23 | Repo `getpipher/pi-package-index` (public), MIT license. |
| 2026-06-23 | No BE/DB — FE SSG + stateless `/api/packages`; data via GH Actions cron committing JSON. |
| 2026-06-23 | GitHub reads via auto `GITHUB_TOKEN` in CI; PAT only on escalation. |
| 2026-06-23 | Vercel hobby, personal account `rz1989s`; first deploy via CLI, git connection after live. |
| 2026-06-23 | DNS: `pi-package` CNAME → `cname.vercel-dns.com`, grey-cloud, on personal CF account. |

## 17. Open Questions

- OQ-1: License — MIT (proposed) or another? *(default MIT unless RECTOR objects)*
- OQ-2: Default row count on first load (50 / 100 / all ~4,300)? *(proposed: 100, "load more")*
- OQ-3: Should the API also expose a `/api/packages/:name` detail endpoint in v1, or defer with detail pages? *(proposed: defer to v1.1)*