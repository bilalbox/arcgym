# ArcGym — agent instructions

## Quality gates

Definition of done is `pnpm verify` (syntax, types, tests, arch boundaries, dead code, clones per `docs/adr/0006-deterministic-quality-and-maintainability-gates.md`). Apply D1 migrations via `pnpm db:migrate:local` or `pnpm db:migrate:remote` per `docs/adr/0005-passwordless-learner-auth-and-d1-sync.md`.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues for this repo; use `gh` per `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map to GitHub labels as documented in `docs/agents/triage-labels.md`.

### Domain docs

Single-context: read root `GLOSSARY.md` (vocabulary), `CONTEXT.md` (product framing), and scoped files under `docs/adr/` (index in `docs/adr/README.md`) per `docs/agents/domain.md`.

