# InterviewOS — Development Plan

## 1. Working Model

Single primary developer (assisted by AI pairing) building feature-by-feature, milestone-by-milestone per `ROADMAP.md`. The plan substitutes for a larger team's tribal knowledge: documentation and tests are not optional polish, they're how a future contributor (or future you) understands *why*, not just *what*.

## 2. Branching & Commit Strategy

- **Trunk-based**: `main` is always deployable. Work happens on short-lived `feature/<milestone>-<slug>` branches, merged via PR (even solo — PR description becomes the historical record of *why*).
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `security:`. Scope tag matches the package/module (e.g., `feat(resume): add ATS scoring`).
- Commit after every completed, working, tested feature — never a commit that leaves the build red or tests failing.
- No direct pushes to `main` without CI green (lint, typecheck, unit+integration tests, build).

## 3. Definition of Done (every feature)

A feature is "done" only when **all** of the following are true:
1. Implementation matches the relevant section of `PRODUCT_REQUIREMENTS.md` / `FEATURE_LIST.md`.
2. Schema changes have a reviewed Prisma migration.
3. API changes are reflected in `API_SPEC.md`.
4. Unit tests for business logic; integration test for the API route; Playwright test for the user-facing flow (see `TESTING_PLAN.md`).
5. Errors are handled explicitly (no silent catch-and-ignore); user-facing error states designed, not just a red toast.
6. Accessibility check passes (keyboard nav, ARIA labels, contrast) for any new UI.
7. No new lint/type errors; no `any` without a documented reason.
8. Docs updated (module README if behavior changed, this doc if process changed).
9. Manually exercised end-to-end (per the `verify` skill) — typecheck and tests confirm correctness, not that the feature actually works for a user.

## 4. Milestone Gating (per project instructions)

At the end of each milestone in `ROADMAP.md`:
1. Stop.
2. Post a summary: what was built, what was deliberately deferred, any trade-offs made and why, current test/coverage status.
3. Wait for explicit approval.
4. Only then branch into the next milestone.

This is a hard rule, not a suggestion — it's the checkpoint that keeps a project this large from drifting from what was actually approved.

## 5. Code Review Checklist (solo-dev self-review before merge)

- [ ] Does this change do one thing? (No drive-by refactors bundled with features.)
- [ ] Would a stranger understand *why* from the PR description + comments alone?
- [ ] Any new dependency justified over what's already in the stack?
- [ ] Any new AI prompt reviewed for injection risk (per `SECURITY.md` §5)?
- [ ] Any new user input validated at the boundary (zod)?
- [ ] Any new resource-owning query scoped by `userId`?
- For higher-risk changes (auth, payments-equivalent, sandbox, security headers), run the `/code-review` skill before merging.

## 6. Testing Gates (CI-enforced)

- PR blocked from merge unless: lint clean, typecheck clean, unit+integration tests pass, build succeeds.
- `main` branch additionally runs the Playwright E2E suite and `pnpm audit` on a schedule (nightly) and on every merge to `main`.
- Coverage targets and tooling detail in `TESTING_PLAN.md`.

## 7. Documentation Requirements Per Module

Each package/app directory that introduces meaningfully new behavior gets:
- A short `README.md` (what it does, how it fits the architecture, how to run its tests in isolation).
- Inline doc-comments only where a non-obvious constraint or invariant exists — not restating what the code already says.

## 8. Trade-off Log

Architectural or scope trade-offs get one dated entry appended below at the moment they're made, so later decisions have the "why" available without archaeology through commit history.

| Date | Decision | Why | Revisit when |
|---|---|---|---|
| 2026-07-06 | Mock AI provider is the default until real API keys are supplied | Build/test full product with zero live API spend and deterministic tests | As soon as real provider keys are available |
| 2026-07-06 | Modular monolith over microservices | Operational simplicity at solo/early-stage scale | If a single module's load profile genuinely diverges (e.g., sandbox execution needs independent scaling — already isolated as a separate worker pool) |
| 2026-07-06 | SSE over WebSockets for AI streaming | One-directional token/audio streams don't need full-duplex; simpler infra | If true bidirectional realtime (e.g., live collaborative interview) is ever required |

## 9. When Requirements Are Ambiguous or Missing

Per the project's operating instructions: when a requirement is missing or under-specified, make the improvement independently, document the reasoning in this plan's trade-off log or the relevant spec doc, and flag it clearly in the milestone summary rather than blocking on a question that has a reasonable, reversible default answer. Genuinely irreversible or user-preference-dependent decisions (e.g., "should there be a public leaderboard") are raised explicitly instead.
