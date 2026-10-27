# ArcGym — agent instructions

## Quality gates

Definition of done: always run `pnpm gate:fast` before considering a task complete (Biome, rev-dep, complexity ratchet, `tsc -b`, and `lint:py`). `pnpm gate` = `gate:fast` + tests (CI / pre-push). See `docs/adr/0006-deterministic-quality-and-maintainability-gates.md` for history; tooling now follows the shared quality-kit (rev-dep replaces dependency-cruiser / knip / jscpd; complexity shrink-only baseline replaces file-level Biome overrides).

Apply D1 migrations via `pnpm db:migrate:local` or `pnpm db:migrate:remote` per `docs/adr/0005-passwordless-learner-auth-and-d1-sync.md`.

## Architecture

- Client: `apps/arcgym-web/src/` (Vite React SPA).
- Edge Functions: `apps/arcgym-web/functions/` (Cloudflare Pages Functions).
- Local Dev Mocks: `apps/arcgym-web/vite/studioFsPlugin.ts` (mocks edge APIs under `pnpm dev`).

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues for this repo; use `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map directly to GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: read root `GLOSSARY.md` (vocabulary), `CONTEXT.md` (product framing), and scoped files under `docs/adr/` (index in `docs/adr/README.md`). See `docs/agents/domain.md`.
