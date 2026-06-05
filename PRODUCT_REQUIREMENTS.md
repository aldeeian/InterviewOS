# InterviewOS — Product Requirements Document

## 1. Vision

InterviewOS is the best AI interview coach for software engineers preparing for real interviews — not a quiz app, not a chatbot wrapper. It combines resume intelligence, job-target analysis, and a conversational AI interviewer that behaves like a skilled human interviewer: it follows up, pushes back on weak answers, remembers context, and produces an honest, actionable improvement plan.

## 2. Target Personas

| Persona | Context | Primary need |
|---|---|---|
| CS Student | No professional experience, applying to internships | Structured practice, confidence building, resume gap awareness |
| New Grad | 0–1 YOE, applying broadly | Behavioral + coding fundamentals, ATS-safe resume |
| Backend/Data/ML Engineer (mid) | 2–6 YOE, targeting a specific company | System design depth, company-specific prep, targeted gap closing |
| Frontend Engineer | Practical/product-leaning | Practical coding + behavioral + some system design |
| Career switcher / bootcamp grad | Needs fundamentals reinforcement | Heavier scaffolding, more hints, slower difficulty ramp |

## 3. Problem Statement

Existing tools are either static question banks (no feedback loop), generic chatbots (no memory, no structure, no scoring), or human mock-interview services (expensive, hard to schedule, inconsistent). Candidates don't know *what* to practice next, and get no rigorous signal on *how* they're actually performing.

## 4. Goals

1. Give every user a personalized, evidence-based prep roadmap (not a generic curriculum).
2. Conduct interviews that feel adversarially real — not a scripted Q&A.
3. Score every answer against a consistent, transparent rubric.
4. Convert scores into a concrete next action, every time.
5. Make company- and role-specific prep first-class, not an afterthought.
6. Be fast and pleasant enough that daily practice is frictionless.

## 5. Non-Goals (v1)

- Native mobile apps (responsive web only; PWA-friendly but not app-store shipped)
- Multi-language UI / localization
- Public leaderboards as a core loop (optional, off by default)
- Human-in-the-loop / marketplace mock interviews
- Enterprise/team admin features (orgs, seats, SSO) — single-tenant personal accounts only for v1
- Native video interviewing (voice only in v1; video is a v2 candidate)

## 6. Functional Requirements Summary

Full feature-level detail lives in `FEATURE_LIST.md`. Module summary:

- **Auth & Profile** — Google/GitHub/email login, password reset, session/device management
- **Dashboard** — streaks, progress, weak topics, recommendations, history
- **Resume Module** — upload, parse, extract, score, ATS-check, versioning
- **Job Description Module** — paste/upload, extraction, difficulty estimate, roadmap seed
- **Resume-vs-JD Analysis** — match %, gaps, checklist, learning roadmap
- **Interview Generator** — behavioral/technical/coding/system design, 4 difficulty tiers, company/role targeting
- **AI Interviewer** — conversational, follow-ups, memory, live scoring
- **Coding Interview** — editor, execution sandbox, hidden/visible tests, complexity analysis
- **Voice Interview** — STT/TTS, latency-optimized, confidence analysis
- **Feedback Engine** — 9-axis scoring, improvement plans
- **Company Preparation** — profiles, culture, likely topics, checklist
- **Learning Center** — weak-topic plans, goals, recommendations, schedule
- **Analytics** — trends, radar charts, mastery, timeline
- **Notes** — notes, bookmarks, flashcards, journal
- **Notifications** — reminders, countdowns, weekly summary

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | First AI token < 800ms (p50) against a live provider; dashboard TTI < 2s on broadband |
| Availability | 99.5% target once in production (single-region acceptable for v1 scale) |
| Accessibility | WCAG 2.1 AA across all core flows |
| Security | OWASP Top 10 mitigated; see `SECURITY.md` |
| Data privacy | Resumes/PII encrypted at rest; user can export/delete all data (GDPR-style right to erasure) |
| Scalability | Stateless app tier horizontally scalable; background workers scale independently |
| Observability | Every request traceable end-to-end; error budget alerting |
| Cost control | Token/cost accounting per AI call; per-user rate limits to bound spend |
| Browser support | Last 2 versions of Chrome, Edge, Firefox, Safari; mobile-responsive down to 360px width |

## 8. Success Metrics

- **Activation:** % of signups who complete resume upload + first interview session within 48h
- **Engagement:** median sessions/user/week ≥ 3 among active users
- **Retention:** week-4 retention of activated users
- **Outcome signal:** self-reported confidence delta pre/post a 2-week prep cycle (in-app survey)
- **Quality:** < 2% of AI-generated questions flagged as irrelevant/low-quality by users

## 9. Constraints & Assumptions

- Single developer initially; documentation and test coverage substitute for a larger team's tribal knowledge.
- AI providers integrated via adapters; this build phase runs against a mocked/dev adapter (no live API keys yet) — see `ARCHITECTURE.md` §AI Adapter Layer.
- Must never present itself as, or copy assets/branding from, any existing commercial product.
