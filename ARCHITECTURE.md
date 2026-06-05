# InterviewOS — Architecture

## 1. Guiding Principles

- **Provider-agnostic AI.** Every AI capability (chat, streaming chat, embeddings, STT, TTS) goes through an adapter interface. No route handler or component ever imports an SDK from OpenAI/Anthropic/Google directly.
- **Modular monolith, not microservices.** One deployable Next.js app + one worker process, sharing a database and a set of internal packages. Microservices would be premature operational overhead at this scale.
- **Boring, provable infrastructure.** Postgres + pgvector + Redis covers relational data, vector search, caching, queues, and pub/sub. No extra moving parts unless a concrete requirement demands it.
- **Streaming-first UX.** Anything AI-generated streams to the client; nothing makes the user stare at a blank spinner for a multi-second LLM call.

## 2. High-Level System Diagram

```
                          ┌─────────────────────────────┐
                          │        Browser (Next.js)     │
                          │  React 19 / RSC / streaming  │
                          └───────────────┬──────────────┘
                                          │ HTTPS
                          ┌───────────────▼──────────────┐
                          │      Next.js App (apps/web)   │
                          │  Route Handlers (/api/v1/*)   │
                          │  Server Actions + RSC         │
                          │  Auth.js session middleware   │
                          │  Rate limiter (Redis)         │
                          └──┬───────────┬────────────┬───┘
                             │           │            │
                 ┌───────────▼──┐  ┌─────▼─────┐ ┌────▼─────────────┐
                 │ Postgres 16  │  │  Redis 7   │ │  AI Adapter Layer │
                 │ + pgvector   │  │ cache/queue│ │ (packages/ai)     │
                 └──────────────┘  └─────┬──────┘ └─┬──────┬──────┬──┘
                                          │          │      │      │
                                    ┌─────▼─────┐  OpenAI Anthropic Gemini
                                    │  Worker    │  adapter adapter adapter
                                    │ (BullMQ)   │  (all behind Mock/dev
                                    │ apps/worker│   adapter by default)
                                    └────────────┘
```

## 3. Monorepo Layout (pnpm + Turborepo)

```
InterviewOS/
├── apps/
│   ├── web/                 # Next.js 15 app (UI + route handlers + server actions)
│   └── worker/               # BullMQ background worker (parsing, embeddings, notifications)
├── packages/
│   ├── db/                   # Prisma schema, client, migrations
│   ├── ai/                   # AIProvider interface + OpenAI/Anthropic/Gemini/Mock adapters
│   ├── ui/                   # shared shadcn/ui components, design tokens
│   ├── config/               # zod env schema, shared constants
│   ├── auth/                 # Auth.js config, session helpers
│   ├── scoring/              # feedback rubric + scoring engine (pure functions, unit-testable)
│   ├── sandbox/               # code execution sandbox client (Judge0-compatible runner)
│   └── shared-types/          # cross-package TypeScript types/zod schemas
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.web / Dockerfile.worker
├── .github/workflows/         # CI/CD
└── turbo.json / pnpm-workspace.yaml
```

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC) | Streaming, server actions, one deploy artifact |
| Language | TypeScript (strict) | Type safety across a large surface area |
| UI | TailwindCSS + shadcn/ui | Fast, accessible, ownable component code (not a black-box lib) |
| ORM | Prisma | Type-safe schema, migrations, good pgvector support via raw extensions |
| Database | PostgreSQL 16 + pgvector | Relational + vector search in one engine — no separate vector DB to operate |
| Cache/Queue | Redis 7 + BullMQ | Rate limiting, session cache, background jobs, pub/sub for streaming status |
| Auth | Auth.js (NextAuth v5) | Google/GitHub/credentials providers, DB session strategy |
| AI orchestration | Custom adapter layer (`packages/ai`) | Provider-swappable; see §5 |
| Realtime/streaming | Server-Sent Events (SSE) over Route Handlers | Simpler and more infra-friendly than WebSockets for one-way AI token streams; voice turn signals use SSE + short-poll fallback |
| Code execution | Isolated sandbox runner (Judge0-style, containerized) | Multi-language execution without running arbitrary code in the main process |
| STT/TTS | Adapter-wrapped (Whisper-compatible STT, provider TTS) | Same swappable pattern as chat |
| File storage | S3-compatible object storage (MinIO locally, S3/R2 in prod) | Resumes, generated audio |
| Observability | OpenTelemetry + Sentry + structured JSON logs | Traceability without vendor lock-in on tracing |
| Testing | Vitest, Testing Library, Playwright, k6 | See `TESTING_PLAN.md` |
| CI/CD | GitHub Actions, Docker, Docker Compose | See `DEPLOYMENT_PLAN.md` |

## 5. AI Adapter Layer (`packages/ai`)

```ts
interface AIProvider {
  chat(req: ChatRequest): Promise<ChatResponse>;
  chatStream(req: ChatRequest): AsyncIterable<ChatChunk>;
  embed(input: string | string[]): Promise<number[][]>;
  transcribe?(audio: AudioInput): Promise<TranscriptResult>;   // STT
  synthesize?(text: string, opts: VoiceOpts): Promise<AudioOutput>; // TTS
}
```

- Concrete adapters: `OpenAIProvider`, `AnthropicProvider`, `GeminiProvider`, `MockProvider`.
- `MockProvider` is the **default** for this build phase: deterministic, fixture-driven responses so the whole product works and is testable with zero API spend. Switching to a live provider is a single env var (`AI_PROVIDER=openai|anthropic|gemini`) plus the corresponding API key — no application code changes.
- A `ProviderRouter` selects the adapter at runtime from validated env config (`packages/config`), and can route different capabilities to different providers (e.g., embeddings on one provider, chat on another) if ever needed.
- Every AI call is logged with token counts, latency, and cost estimate to a `ai_usage_log` table for cost accounting and future rate limiting.
- Prompt templates live in `packages/ai/prompts/*` as versioned, testable modules — never inline string concatenation in route handlers.

## 6. Streaming & Realtime

- AI chat responses stream via SSE from a Route Handler to the client; the client renders tokens incrementally using a shared `useAIStream` hook.
- Long-running jobs (resume parsing, embedding generation) run in `apps/worker` via BullMQ; the client polls a lightweight status endpoint or subscribes to a Redis pub/sub-backed SSE channel for job completion — no WebSocket infra required at this scale.
- Voice interview turn-taking uses short-lived SSE streams per turn plus client-side VAD (voice activity detection) to decide when the user has finished speaking.

## 7. Background Jobs (`apps/worker` + BullMQ)

| Queue | Job | Trigger |
|---|---|---|
| `resume-parsing` | Extract text, parse structure, score | Resume upload |
| `jd-parsing` | Extract requirements from JD | JD paste/upload |
| `embeddings` | Generate/upsert pgvector embeddings | New resume, JD, question, or answer |
| `interview-scoring` | Run feedback engine on completed answer | Answer submitted |
| `notifications` | Daily reminders, weekly summary, countdowns | Cron (BullMQ repeatable jobs) |
| `company-profile-refresh` | Refresh cached company prep data | Scheduled / on-demand |

## 8. Caching Strategy (Redis)

- Session/rate-limit state (sliding window counters per user/IP per route group).
- Hot-read caches: dashboard aggregates, company profiles, question-bank pages (TTL-based invalidation).
- Idempotency keys for AI-triggering mutations (avoid duplicate generation on client retry).

## 9. Vector Search (pgvector)

- Embedding columns on `resume_embeddings`, `job_description_embeddings`, `question_embeddings`, `answer_embeddings` (see `DATABASE_DESIGN.md`).
- IVFFlat/HNSW index (HNSW preferred on pg16) for approximate nearest-neighbor search, used for: question dedup/relevance, resume↔JD semantic matching (beyond keyword overlap), "similar past questions" retrieval for the AI interviewer's memory.

## 10. Security Boundary Summary

Full detail in `SECURITY.md`. Architecturally relevant points: all file uploads pass through type/size/malware validation before hitting storage; the code-execution sandbox runs in a locked-down, resource-capped, network-isolated container per submission; all AI provider calls strip/redact PII where feasible before leaving the boundary is *not* fully possible (the model needs the resume content) — instead we rely on provider data-usage opt-outs and clear user consent/disclosure.

## 11. Environment Config

`packages/config` exports a single zod-validated `env` object. The app **fails to boot** if required vars are missing/malformed — no silent undefined leaking into runtime code. Separate schemas for `apps/web` and `apps/worker` (worker doesn't need e.g. `NEXTAUTH_URL`).

## 12. Scalability Notes

- `apps/web` is stateless — horizontally scalable behind a load balancer.
- `apps/worker` scales independently by queue concurrency; CPU-heavy jobs (PDF parsing) isolated from I/O-heavy jobs (AI calls) via separate queues.
- Postgres is the single source of truth; read replicas are a future optimization, not needed at initial scale.
- Sandbox code execution is the most resource-sensitive path — isolated worker pool with hard timeouts/memory caps, scaled separately from the AI worker pool.
