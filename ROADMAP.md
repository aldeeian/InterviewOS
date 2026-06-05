# InterviewOS — Roadmap

This roadmap defines the order of construction. Each milestone is a vertical slice: schema → API → UI → tests → docs. **No milestone starts until the previous one is approved.** At the end of every milestone, work stops, a summary is posted, and we wait for explicit approval before continuing.

Milestones are dependency-ordered, not calendar-dated — "when it's done, reviewed, and tested" beats a fake deadline for a project of this shape.

## M0 — Foundations
- pnpm + Turborepo monorepo scaffold (`apps/web`, `packages/*`)
- Next.js 15 (App Router) + TypeScript strict + ESLint + Prettier
- Docker Compose: Postgres 16 + pgvector, Redis 7
- Prisma initialized, connected, first migration (empty)
- Env validation (zod) fails fast on missing/malformed config
- CI skeleton: install, lint, typecheck, build on every push
- `packages/config`, `packages/ui` (shadcn/ui theme), `packages/db` scaffolds
**Exit criteria:** `pnpm dev` boots the app against dockerized Postgres/Redis; CI green on an empty diff.

## M1 — Auth & Accounts
- Auth.js (NextAuth v5) with Google, GitHub, and credentials (email/password) providers
- Email verification + password reset via transactional email (Resend adapter, swappable)
- Session management (DB-backed sessions, revocation, "sign out everywhere")
- Profile management (name, avatar, timezone, notification prefs)
- Rate limiting on auth routes, security headers, CSRF protection
**Exit criteria:** full signup/login/reset/logout flow works end-to-end with Playwright coverage.

## M2 — Core Data Layer & Dashboard Shell
- Full Prisma schema (see `DATABASE_DESIGN.md`) migrated
- App shell: nav, dashboard layout, empty states, theming, responsive breakpoints
- Dashboard widgets wired to real (empty) data: streak, upcoming interviews, recent sessions
**Exit criteria:** authenticated user lands on a real dashboard shell with no mock data.

## M3 — Resume Module
- Upload (PDF/DOCX), virus/type validation, storage (S3-compatible, MinIO locally)
- PDF/DOCX parsing pipeline (background job) → structured extraction: skills, experience, education, projects
- Resume scoring + ATS compatibility analysis + gap detection
- Version management (multiple resumes, diff between versions)
**Exit criteria:** a user can upload a resume and see structured extraction + score within seconds (async job, polled/streamed status).

## M4 — Job Description Module + Resume-vs-JD Analysis
- Paste JD text or upload PDF → extraction: required/preferred skills, responsibilities, tech stack, behavioral expectations, difficulty estimate
- Resume↔JD matching engine: skill match %, missing/strong/weak skills, ATS score, improvement checklist
- Auto-generated preparation roadmap from the gap analysis
**Exit criteria:** given a resume + JD, the user gets a concrete, prioritized prep roadmap.

## M5 — AI Provider Adapter Layer
- Unified `AIProvider` interface (chat, streaming chat, embeddings, STT, TTS)
- Adapters: OpenAI, Anthropic, Google Gemini — swappable via config, no hardcoded provider
- Mock/dev-mode adapter (deterministic fixture responses) — **default for this build phase**, no live API spend until keys are supplied
- pgvector-backed embedding storage + similarity search
- Prompt template registry, token/cost accounting per request
**Exit criteria:** switching `AI_PROVIDER=openai|anthropic|gemini|mock` in env changes the backing model with zero code changes elsewhere.

## M6 — Interview Generator + Question Bank
- Generators: behavioral, technical, coding, system design — company-specific and role-specific
- Difficulty levels (easy/medium/hard/expert), unlimited generation via AI + curated seed bank
- Vector search over question bank for relevance/dedup
**Exit criteria:** a user can request "Backend, Hard, System Design, Stripe-style" and get a coherent question set.

## M7 — AI Interviewer + Coding Sandbox
- Conversational interviewer: multi-turn memory, natural follow-ups, challenges weak answers, per-answer scoring
- Coding interview: integrated editor (Monaco), multi-language execution sandbox (isolated runner), visible + hidden tests, complexity/runtime/memory analysis, hints, alternative solutions
**Exit criteria:** a full mock technical + coding interview can be conducted start to finish with scored output.

## M8 — Voice Interview
- STT (streaming) + TTS (low-latency) integration behind the same provider-adapter pattern
- Turn-taking/natural pause detection, conversation memory shared with text interviewer core
- Confidence analysis from speech (pace, filler words, pauses)
**Exit criteria:** a full mock interview can be conducted by voice with <1.5s perceived response latency (mock provider timing budget).

## M9 — Feedback Engine + Analytics + Learning Center
- Scoring rubric: communication, confidence, technical accuracy, depth, structure, completeness, grammar, vocabulary, professionalism
- Improvement plans generated per session; weak-topic detection feeding the Learning Center
- Analytics: daily/weekly/monthly practice, accuracy/confidence trends, topic mastery radar chart, progress timeline
- Learning Center: daily/weekly goals, practice plans, reading/coding recommendations, mock interview scheduling
**Exit criteria:** after 3+ sessions, dashboard shows real trend charts and a concrete next-practice recommendation.

## M10 — Company Prep, Notes, Notifications, Polish
- Company profiles: overview, products, values, engineering culture, likely topics, behavioral questions, prep checklist, recent news (best-effort, cached)
- Notes, bookmarks, flashcards, interview journal
- Notifications: daily reminder, practice reminder, interview countdown, weekly summary (email + in-app)
- Accessibility pass (WCAG 2.1 AA), performance pass (Core Web Vitals), responsive QA
**Exit criteria:** product feels complete end-to-end for a full weekly prep cycle.

## M11 — Hardening & Launch Readiness
- Full Playwright E2E suite across critical paths, load testing (k6) on hot endpoints
- Security review pass against `SECURITY.md`, dependency audit, secrets audit
- CI/CD finalized (staging + production pipelines), backup/restore drill, rollback drill
- Docs finalized across all modules
**Exit criteria:** launch checklist fully checked; ready for real users at small scale.

---
**Working rule:** feature-by-feature, never leave broken code or failing tests, commit after each completed feature, stop and summarize at each milestone boundary, wait for approval before the next milestone.
