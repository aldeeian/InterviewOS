# InterviewOS — Deployment Plan

## 1. Environments

| Env | Purpose | Infra |
|---|---|---|
| Local | Development | Docker Compose: Postgres+pgvector, Redis, MinIO (S3-compatible), app + worker in watch mode |
| Staging | Pre-production validation, E2E/load testing target | Same topology as prod, smaller instance sizes, seeded/synthetic data only |
| Production | Real users | Managed Postgres (with pgvector extension enabled) + managed Redis + object storage (S3/R2) + containerized app/worker |

## 2. Local Development (`docker/docker-compose.yml`)

Services: `postgres` (pgvector image), `redis`, `minio`, `app` (Next.js dev server), `worker` (BullMQ worker, watch mode), plus a one-shot `migrate` service running `prisma migrate deploy` on stack startup. `.env.example` documents every required variable; `packages/config`'s zod schema throws a clear, specific error on boot if anything required is missing — no cryptic runtime crashes three layers deep.

## 3. Container Images

- Multi-stage `Dockerfile.web`: deps → build (Next.js standalone output) → slim runtime image (distroless or `node:20-slim`), non-root user.
- `Dockerfile.worker`: shares the deps stage, runs the BullMQ worker entrypoint only — no Next.js server code in the worker image's runtime footprint.
- Images tagged with git SHA; `latest` never deployed directly to production (always an explicit SHA/tag).

## 4. CI/CD Pipeline (GitHub Actions)

**On every PR (`pr.yml`):**
1. Install (`pnpm install --frozen-lockfile`)
2. Lint + typecheck
3. Unit + integration tests (Postgres/Redis service containers)
4. Build all apps/packages (Turborepo cache)

**On merge to `main` (`main.yml`):**
1. All of the above
2. `pnpm audit` (fails on high/critical)
3. Build + push Docker images (tagged with SHA) to registry
4. Deploy to **staging** automatically
5. Run Playwright E2E + k6 smoke suite against staging
6. **Manual approval gate** → deploy the same, already-tested image to **production**
7. Run Prisma migrations against production DB as a distinct, logged step before traffic is shifted (see §6)

Production deploys always promote a **staging-verified image** — never a fresh build straight to prod.

## 5. Environment Variable Validation

`packages/config` exposes `webEnv` and `workerEnv` zod schemas. CI runs a "config sanity" step that validates `.env.example` has an entry for every schema key (prevents silent drift between code and documented config). Missing/invalid required vars at boot → process exits with a clear, named error, never an ambiguous stack trace.

## 6. Database Migrations

- `prisma migrate deploy` runs as its own CI/CD step, before the new app version receives traffic, against a connection pooled through PgBouncer (or the managed provider's equivalent) to avoid connection exhaustion during rolling deploys.
- Backward-compatible migration discipline: additive changes ship first, code deploys, then destructive cleanup (drop column, etc.) ships in a later, separate migration — so a mid-rollout mix of old/new app code against the DB never breaks.
- Nightly automated backups (managed provider) + a documented, tested restore procedure; retention per the provider's standard tier (e.g., 7–14 days) as a starting point.

## 7. Observability in Production

- Structured JSON logs shipped to the hosting provider's log aggregation (or a lightweight self-hosted stack if self-managed).
- Sentry for error tracking (frontend + backend + worker), with release tagging tied to the deployed git SHA.
- OpenTelemetry traces across the request → AI adapter → DB path so a slow interview turn is diagnosable end-to-end.
- Uptime/health checks (`/api/v1/health`) polled by the orchestrator for liveness/readiness; `/api/v1/health/deep` polled on a longer interval to catch AI-provider outages proactively.
- Alerting thresholds: error rate spike, p95 latency regression, queue backlog growth (BullMQ), AI cost anomaly (from `AIUsageLog`).

## 8. Rollback Strategy

- Every deploy is a tagged image; rollback = redeploy the previous tag (fast, since it's already built and staging-verified).
- Because migrations are additive-first, rolling back the app image while a migration has already run is safe by design — old code simply ignores new columns it doesn't use.
- A rollback runbook (exact commands/steps) lives alongside this doc once the CD pipeline is implemented in M11, and is drilled at least once before launch.

## 9. Scaling Path

- `apps/web`: horizontally scaled behind a load balancer, stateless.
- `apps/worker`: scaled by queue depth (BullMQ concurrency + replica count), with the sandbox execution pool isolated and scaled independently since it's the most resource-sensitive workload.
- Postgres: vertical scaling first; read replicas considered only if/when read load from analytics queries measurably contends with write-path latency.
- Redis: single managed instance is sufficient at initial scale; cluster mode is a future option, not a day-one requirement.

## 10. Launch Checklist (ties to `ROADMAP.md` M11)

- [ ] Staging soak test (48h) with synthetic traffic, no unexplained errors
- [ ] Backup/restore drill completed successfully
- [ ] Rollback drill completed successfully
- [ ] All `SECURITY.md` §11 items checked
- [ ] Alerting verified (deliberately trigger one of each alert type in staging)
- [ ] Domain/TLS/DNS configured and verified
- [ ] Privacy policy, ToS, and AI-data-usage disclosure published
