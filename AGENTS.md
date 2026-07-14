<!-- Satellite context file — extends the global hub (~/.claude/CLAUDE.md | ~/.pi/agent/AGENTS.md). Host-neutral; project-specific only. Do not duplicate hub standards here. -->

# pi-package-index

> **Unofficial** community index of [Pi coding-agent](https://github.com/earendil-works/pi) packages — ranked by downloads + GitHub stars + maintenance health, with filterable search and a public JSON API. Live at **pi-package.rectorspace.com**. Not affiliated with or endorsed by earendil-works.

## What

The official `pi.dev/packages` gallery lists ~4,300 npm packages tagged `pi-package` but lacks GitHub stars, maintenance signals, robust filtering, and a working API. This project fills those gaps:

- **Ranked** by npm downloads/mo + GitHub stars + last push + maintained badge.
- **Searchable & filterable** by type, category, min-downloads, min-stars, maintained-only.
- **Public JSON API** at `/api/packages` (the official `pi.dev/api/packages` returns 501).
- **Daily refreshed** via a GitHub Actions cron that commits `data/packages.json`.

## Stack

Next.js 15 (App Router, SSG) · TypeScript strict · Tailwind v4 · Lucide · FlexSearch · Vercel (hobby) · pnpm. No backend, no database — see `SPEC.md` for the full architecture.

## Common Commands

```bash
pnpm install
pnpm dev          # local app
pnpm build        # next build (runs prebuild copy-data first)
pnpm start        # next start
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint .
pnpm pipeline     # regenerate data/packages.json (needs npm + GitHub access; CI uses GITHUB_TOKEN)
pnpm pipeline:readmes  # regenerate READMEs
```

## Data Sources

- npm registry (`keywords:pi-package`) + npm downloads API
- GitHub REST API (stars, last push, open issues, archived) via the CI `GITHUB_TOKEN`

Refreshed daily at 04:00 UTC. The `generatedAt` field in every response tells you the index age.

## Deployment

Vercel (hobby). The GitHub Actions cron commits `data/packages.json` daily; the app is statically regenerated from that file.

## Notes

- Add a package by publishing to npm with the `pi-package` keyword — it appears on the next refresh.
- See the [Pi package docs](https://github.com/earendil-works/pi/blob/main/docs/packages.md).