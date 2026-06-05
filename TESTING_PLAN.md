# InterviewOS — Testing Plan

## 1. Testing Pyramid

```
        ▲  E2E (Playwright)        — critical user journeys, few, slow, high confidence
       ╱ ╲  Integration (Vitest +   — API route handlers against a real Postgres
      ╱   ╲  testcontainers)          (via Docker) and real Redis
     ╱     ╲ Unit (Vitest)          — pure logic: scoring engine, extraction parsers,
    ╱───────╲                          matching algorithm, prompt builders
```

Bulk of coverage lives in unit + integration; E2E stays focused on the handful of flows a user actually depends on end-to-end.

## 2. Tooling

| Layer | Tool |
|---|---|
| Unit / component | Vitest + Testing Library |
| Integration (API + DB) | Vitest + `testcontainers` (ephemeral Postgres/pgvector + Redis per run) |
| E2E | Playwright (Chromium + WebKit + Firefox on critical paths, Chromium-only on the rest) |
| Accessibility | `@axe-core/playwright` assertions baked into E2E specs |
| Load/perf | k6, targeting hot endpoints (session turn submission, question generation, dashboard summary) |
| Type safety | `tsc --noEmit` in strict mode, part of CI, treated as a test gate |
| Visual regression (optional, P2) | Playwright screenshot diffing on key pages |

## 3. AI Mocking Strategy

- All tests run against `MockProvider` by default — deterministic, fixture-based responses keyed by request hash, so tests never hit a real network or incur cost, and never flake due to model non-determinism.
- Fixture library (`packages/ai/fixtures/*`) covers: a full mock interview transcript, resume parse output, JD extraction output, scoring output — reused across unit/integration/E2E.
- A small, explicitly-tagged (`@live-ai`) integration suite exists to run manually (or in a scheduled, non-blocking CI job) against real providers once API keys are available, to catch adapter drift from upstream API changes. Never blocks merges.

## 4. Coverage Targets

| Package | Line coverage target | Rationale |
|---|---|---|
| `packages/scoring` | 90%+ | Pure logic, core trust surface (users trust their scores) |
| `packages/ai` (adapters, excluding live network paths) | 85%+ | Provider-swap correctness is load-bearing |
| `apps/web` route handlers | 80%+ | Business logic; UI glue code is covered via E2E instead |
| UI components | Best-effort, prioritize interactive/stateful components over presentational ones | Presentational coverage has low ROI |

CI fails the PR if a package drops below its target on the diff (not a hard global gate that blocks unrelated work).

## 5. Critical E2E Journeys (must exist before M11 exit)

1. Signup (email) → verify → login → logout.
2. OAuth login (mocked provider in test env).
3. Upload resume → see parsed data + score.
4. Paste JD → run analysis → see roadmap.
5. Start a text-based behavioral session → answer 3 turns → end → view feedback radar chart.
6. Start a coding session → submit passing and failing solutions → see test results + complexity analysis.
7. Voice session smoke test (STT/TTS mocked) → completes without dropping audio state.
8. Dashboard reflects a completed session (streak increments, recent session appears).
9. Notes/flashcard/bookmark CRUD.
10. Notification preference change persists and suppresses/enables the relevant reminder.

## 6. Test Data & Fixtures

- Seed script (`packages/db/seed.ts`, shared with dev) provides a baseline dataset for integration/E2E: demo user, curated question bank, sample companies.
- Each E2E spec creates its own isolated user (unique email) to avoid cross-test interference; DB reset between full suite runs via testcontainers' ephemeral lifecycle.
- Synthetic resume/JD fixtures (plain-text and real-shaped PDFs) checked into `apps/web/tests/fixtures/` — no real user data ever used in tests.

## 7. CI Gating

- Every PR: lint, typecheck, unit tests, integration tests, build. Must be green to merge.
- `main` branch (post-merge) + nightly schedule: full Playwright suite, `pnpm audit`, and a lightweight k6 smoke run against a staging deploy.
- Flaky test policy: a test that fails intermittently is quarantined (tagged, excluded from blocking) within 24h and fixed within one milestone — never left flaky indefinitely.

## 8. Manual Verification

Per the project's own development rules, automated tests confirm correctness but not felt-experience — every user-facing feature is also manually exercised (dev server + real interaction) before being marked done, per `DEVELOPMENT_PLAN.md` §3 Definition of Done, using the `verify` skill where applicable.
