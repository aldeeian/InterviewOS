# InterviewOS — API Specification

All routes are Next.js Route Handlers under `/api/v1/*`. JSON in, JSON out, except SSE streaming endpoints (`text/event-stream`) and file upload endpoints (`multipart/form-data`).

## 1. Conventions

- **Auth:** session cookie (Auth.js) on every request except `/api/v1/auth/*`. Unauthenticated → `401` with the standard error envelope.
- **Error envelope:**
```json
{ "error": { "code": "RESUME_PARSE_FAILED", "message": "Human-readable message", "details": {} } }
```
- **Pagination:** cursor-based — `?cursor=<id>&limit=20` → `{ "items": [...], "nextCursor": "..." | null }`
- **Rate limiting:** every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. `429` on exceed, with `Retry-After`.
- **Idempotency:** mutating AI-triggering endpoints accept `Idempotency-Key` header; duplicate keys return the original result instead of re-triggering generation.
- **Versioning:** path-based (`/api/v1`); breaking changes ship as `/api/v2` with the old version kept alive during migration.

## 2. Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Email/password signup |
| POST | `/api/v1/auth/login` | Credentials login (OAuth handled by Auth.js built-in routes) |
| POST | `/api/v1/auth/logout` | Revoke current session |
| POST | `/api/v1/auth/password-reset/request` | Send reset email |
| POST | `/api/v1/auth/password-reset/confirm` | Set new password from token |
| GET | `/api/v1/auth/sessions` | List active sessions/devices |
| DELETE | `/api/v1/auth/sessions/:id` | Revoke a specific session |

## 3. Profile & Dashboard
| Method | Path | Purpose |
|---|---|---|
| GET/PATCH | `/api/v1/me` | Get/update profile & notification prefs |
| GET | `/api/v1/dashboard/summary` | Streak, upcoming interviews, recent sessions, weak topics, recommendations |

## 4. Resume Module
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/resumes` | Upload resume (multipart) → `202 Accepted`, enqueues parsing job |
| GET | `/api/v1/resumes` | List resumes (with versions summary) |
| GET | `/api/v1/resumes/:id` | Resume detail incl. latest version parsed data |
| GET | `/api/v1/resumes/:id/versions/:versionId` | Specific version detail |
| GET | `/api/v1/resumes/:id/status` | Poll parsing job status (`processing`/`ready`/`failed`) |
| DELETE | `/api/v1/resumes/:id` | Soft-delete |
| PATCH | `/api/v1/resumes/:id/primary` | Mark as primary resume |

## 5. Job Description Module
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/job-descriptions` | Paste text or upload PDF → enqueues extraction |
| GET | `/api/v1/job-descriptions` | List |
| GET | `/api/v1/job-descriptions/:id` | Detail incl. extracted fields |
| DELETE | `/api/v1/job-descriptions/:id` | Delete |

## 6. Resume ↔ JD Analysis
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/analyses` | `{ resumeVersionId, jobDescriptionId }` → creates analysis (async) |
| GET | `/api/v1/analyses/:id` | Match %, gaps, checklist, roadmap |
| GET | `/api/v1/analyses` | History |

## 7. Interview Generator
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/questions/generate` | `{ category, difficulty, companyTag?, roleTag?, count }` → generated questions |
| GET | `/api/v1/questions` | Browse question bank (filter by category/difficulty/company) |

## 8. Interview Sessions (AI Interviewer, Coding, Voice, System Design)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/sessions` | Start a session `{ type, mode, difficulty, companyId?, jobDescriptionId? }` |
| GET | `/api/v1/sessions/:id` | Session detail + turns |
| GET | `/api/v1/sessions` | History (paginated) |
| POST | `/api/v1/sessions/:id/turns` | Submit candidate answer (text) → **SSE stream** of interviewer's next turn + live score |
| POST | `/api/v1/sessions/:id/turns/audio` | Submit candidate answer (audio, voice mode) → STT → same streamed response, plus TTS audio chunks |
| POST | `/api/v1/sessions/:id/code` | Submit code for the current coding turn → runs sandbox, returns test results + analysis |
| POST | `/api/v1/sessions/:id/end` | End session → triggers full feedback engine summary |
| GET | `/api/v1/sessions/:id/feedback` | Full 9-axis scoring + improvement plan |

**SSE event shape** (`/turns` and `/turns/audio`):
```
event: token        data: {"text":"..."}
event: score        data: {"axis":"technicalAccuracy","value":72}
event: audio_chunk   data: {"base64":"..."}   (voice mode only)
event: done          data: {"turnId":"..."}
event: error         data: {"code":"...","message":"..."}
```

## 9. Company Preparation
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/companies` | Search/list companies |
| GET | `/api/v1/companies/:slug/profile` | Full prep profile (cached, refreshable) |
| POST | `/api/v1/companies/:slug/refresh` | Force-refresh cached profile (rate-limited, admin or cooldown-gated) |

## 10. Learning Center & Analytics
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/learning/plan` | Current week's practice plan + goals |
| POST | `/api/v1/learning/plan/goals/:id/complete` | Mark a goal done |
| GET | `/api/v1/analytics/trends` | Daily/weekly/monthly practice + accuracy/confidence trends |
| GET | `/api/v1/analytics/mastery` | Topic mastery radar data |

## 11. Notes, Bookmarks, Flashcards, Journal
| Method | Path | Purpose |
|---|---|---|
| CRUD | `/api/v1/notes` | Notes |
| CRUD | `/api/v1/bookmarks` | Bookmarked questions |
| CRUD | `/api/v1/flashcards` | Flashcards |
| GET | `/api/v1/flashcards/due` | Cards due for spaced-repetition review |
| CRUD | `/api/v1/journal` | Interview journal entries |

## 12. Notifications
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/notifications` | List (paginated, unread-first) |
| PATCH | `/api/v1/notifications/:id/read` | Mark read |
| PATCH | `/api/v1/me/notification-prefs` | Update reminder/summary preferences |

## 13. Health & Internal
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness/readiness (checks DB, Redis) — used by Docker/orchestrator |
| GET | `/api/v1/health/deep` | Extended check incl. AI provider reachability (admin-only) |

## 14. Rate Limit Tiers (default, per authenticated user)

| Route group | Limit |
|---|---|
| Auth (login/reset) | 10 / 10 min / IP |
| Resume/JD upload | 20 / hour |
| Question generation | 60 / hour |
| Interview turn (AI call) | 120 / hour |
| Everything else (reads) | 600 / hour |

Not-signed-in traffic is limited by IP; signed-in traffic by user ID (see `SECURITY.md` §Rate Limiting).
