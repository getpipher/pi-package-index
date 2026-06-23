# PLAN — v1 implementation

Derived from [SPEC.md](./SPEC.md). Tracked commit-by-commit. Post-v1 work is in issues #1–#8.

## Locked decisions (2026-06-23)
1. **Type detection:** heuristic from name + description (zero extra npm calls). Accurate `pi`-manifest type deferred to issue #5.
2. **First seed scope:** capped `--limit 300` real data now; nightly cron fills to ~4,300.
3. **Default rows:** 100 initial + "load more"; sort downloads/mo desc.
4. **`/api/packages/:name` detail endpoint:** defer to v1.1 (with detail pages, issue #1).
5. **Bulk files:** both — `public/data/packages.json` + `.min.json` downloadable AND the filtered `/api/packages` API.

## Phases
- [x] **Phase 0 — Project init** — package.json, tsconfig, next.config, postcss (Tailwind v4), eslint flat config, globals.css, minimal layout/page. Gate: `pnpm install` + `pnpm typecheck` + `pnpm build` clean.
- [x] **Phase 1 — Data layer + types** — `lib/types.ts`, `lib/data.ts`, `lib/filter.ts` (shared filter/sort/paginate). Gate: types compile.
- [x] **Phase 2 — Pipeline** — `pipeline/{npm,github,categories,normalize,run}.ts`, `data/.cache` resume, `--limit`/`--no-cache` flags, writes `data/packages.json` + `.min.json`. Gate: `pnpm pipeline --limit 50` → valid JSON matching schema.
- [x] **Phase 3 — UI core (SSG)** — `layout.tsx` (nav + disclaimer footer), `page.tsx` (server, reads data), `Explorer` client (FlexSearch, filters, sort, URL params, load-more), `PackageTable`/`Filters`/`SearchBar`/`PackageRow`, Lucide icons. Gate: `pnpm build` SSGs home; filters work in `pnpm dev`.
- [x] **Phase 4 — Public API** — `/api/packages` route (stateless, `lib/filter`, paginate ≤100, CORS `*`, cache headers) + copy generated JSON to `public/data/`. Gate: `curl` returns valid filtered JSON.
- [x] **Phase 5 — About page** — sources, refresh cadence, how-to-get-listed, disclaimer, links. Gate: builds.
- [x] **Phase 6 — Verify + lockfile** — `typecheck && lint && build` green; commit `pnpm-lock.yaml`; push; CI green on `main`.
- [ ] **Phase 7 — Ship (separate turn)** — Vercel CLI deploy (personal, hobby) → CF CNAME `pi-package` → `cname.vercel-dns.com` (grey-cloud) → add prod domain → git connection → first cron full run → GitLab mirror + `GITLAB_SSH_KEY`.