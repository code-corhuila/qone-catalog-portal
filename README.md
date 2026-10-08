# qone-catalog-portal

> catalog bounded context: web UI (remote)

Part of the **Qampus (Quorum One)** distributed system — team `quorum-one`, Grupo 1.
Governance and documentation live in [`qone-docs`](https://github.com/code-corhuila/qone-docs).

## Purpose

The web portal of the **catalog** domain (course norm 5.4, Annex H): subjects with
prerequisites, sections with schedule and seats, the admin forms that create them and the
professor's own sections. It is a Module Federation **remote** named `catalog` that exposes
`./App`; `qone-front` mounts it at `/catalog/*`. The portal owns only its screens: the HTTP
client and the session come from the shell (`shell/apiClient`, `shell/session`) and the portal
never knows the gateway URL or the token (norm 5.4.1, verified on the built bundle by
`scripts/check-isolation.sh`).

Specification: `07-api/contracts/openapi/qone-catalog-api.yaml` (operations CA-01..CA-12),
`06-data/models.md` (schema `catalog`), `09-microservices/services/03-catalog-api/README.md`,
ADR-007 and ADR-009 in `qone-docs`. Stories: `code-corhuila/qone-docs#39` (HU-CAT-001),
`#40` (HU-CAT-002), `#41` (HU-CAT-003), `#48` (HU-WEB-002).

## How to run it

Requirements: Node 22 LTS (or 24), npm, and the shell (`qone-front`) running at `VITE_SHELL_URL`.

```bash
cp .env.example .env        # VITE_SHELL_URL only; .env is ignored by git
npm ci
npm run dev                 # http://localhost:5002 (standalone) - or open /catalog in the shell
```

Checks (`ci.yml` runs the same on every pull request):
```bash
npm run typecheck           # TypeScript strict
npm test                    # Vitest + Testing Library + MSW; contract test against the YAML
npm run build               # remoteEntry.js and assets in dist/
npm run check:isolation     # no gateway URL, no token handling, no raw fetch in dist/
```

## Dependencies

- `qone-front` at `VITE_SHELL_URL`: `shell/apiClient`, `shell/session` and the mount point `/catalog/*`.
- `qone-catalog-api` behind the gateway for real data; with the shell's `VITE_USE_MOCKS=true` the fixtures answer.
- `qone-identity-api` (ID-05) for the professor picker of the section form (ADMIN).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `qone-docs`.
