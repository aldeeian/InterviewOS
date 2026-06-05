# InterviewOS — Security

## 1. Threat Model Summary

| Asset | Threats | Priority |
|---|---|---|
| User credentials / sessions | Credential stuffing, session hijack, weak reset flow | Critical |
| Resume/PII content | Data breach, over-broad AI-provider data retention, insecure storage | Critical |
| AI provider API keys | Leakage via logs/client bundle, cost-abuse | Critical |
| Code execution sandbox | Sandbox escape, resource exhaustion, network exfiltration from submitted code | Critical |
| Uploaded files (resume/JD) | Malicious file upload (polyglot, zip bomb, oversized), PDF parser exploits | High |
| AI prompts/outputs | Prompt injection (e.g., resume text instructing the model), jailbreak via interview answers | High |
| Interview/session data | IDOR (accessing another user's sessions), tampering with scores | High |
| Notifications/email | Phishing via spoofed sender, unsubscribe/compliance | Medium |

## 2. OWASP Top 10 (2021) Mapping

| Risk | Mitigation |
|---|---|
| A01 Broken Access Control | Every resource query scoped by `userId` at the ORM layer (never trust client-supplied IDs alone); centralized authorization helper (`assertOwnsResource`) used in every route handler; deny-by-default middleware on `/api/v1/*` |
| A02 Cryptographic Failures | Argon2id for password hashing; TLS everywhere (HSTS); encryption at rest for OAuth tokens and PII columns (pgcrypto or app-level envelope encryption); secrets never logged |
| A03 Injection | Prisma parameterized queries only — no raw SQL string interpolation; zod validation on every input boundary; sandbox execution isolates code-injection risk from submitted code |
| A04 Insecure Design | Threat-modeled per module (this doc); rate limits and idempotency keys designed in from `API_SPEC.md`, not bolted on |
| A05 Security Misconfiguration | Security headers via middleware (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`); no debug endpoints in production build; dependency pinning |
| A06 Vulnerable/Outdated Components | Dependabot + `pnpm audit` in CI, blocking on high/critical; quarterly manual dependency review |
| A07 Identification & Auth Failures | Auth.js with secure session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`), account lockout/backoff on repeated failed logins, MFA-ready design (TOTP field reserved on `User`, not required for v1) |
| A08 Software/Data Integrity Failures | CI runs from lockfile only (`pnpm install --frozen-lockfile`); signed container images; migrations reviewed before merge |
| A09 Logging & Monitoring Failures | Structured logs for all auth events, rate-limit trips, sandbox failures, AI provider errors; Sentry alerting on error-rate spikes |
| A10 Server-Side Request Forgery | Any user-supplied URL (e.g., "company news" fetch) goes through an allowlisted fetcher with private-IP-range blocking, not a raw `fetch(userUrl)` |

## 3. Authentication & Session Security

- Passwords: Argon2id, min 12 chars enforced client + server side, checked against a common-password blocklist.
- Sessions: DB-backed (not pure JWT) so they can be revoked instantly; rotated on privilege-relevant changes (password change revokes all other sessions).
- Password reset tokens: single-use, 15-minute expiry, hashed at rest, invalidate all sessions on successful reset.
- Rate limiting on `/auth/*`: 10 attempts / 10 min / IP+email combo, exponential backoff beyond that.
- CSRF: Auth.js built-in CSRF token for credential flows; SameSite cookies as defense-in-depth.

## 4. File Upload Security (Resumes / JDs)

- Allowlist MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) validated by **content sniffing**, not just extension/header.
- Max file size (e.g., 10MB); reject zip-bomb-style nested archives (DOCX is a zip — cap decompressed size).
- Parsing runs in the isolated worker process, not the web request path, so a malicious file can't tie up the app tier or crash the user-facing process.
- Files stored in object storage with randomly generated keys (no user-controlled path), served via short-lived signed URLs, never directly public.
- Antivirus scan step (ClamAV container) before a file is marked `ready`, feasible to add as a worker step; files failing the scan are quarantined and the upload marked `failed` with no user-facing content exposure.

## 5. AI-Specific Risks

- **Prompt injection:** resume/JD/answer text is untrusted input from the user's perspective *and* potentially from third parties (e.g., a JD copy-pasted from an external posting). System prompts are structured to clearly delineate instructions vs. untrusted content (delimited blocks), and the model is never granted tool/function access that could take real actions based on embedded instructions in user content.
- **Data sent to providers:** users are informed (ToS/privacy policy + in-app notice) that resume/interview content is sent to the configured AI provider for processing. Provider selection defaults to providers with enterprise no-training-on-API-data commitments; this is a documented, reviewable config, not a silent default.
- **Cost abuse:** per-user rate limits on generation/interview endpoints (see `API_SPEC.md` §14); `AIUsageLog` enables anomaly detection (sudden spend spike → auto-throttle + alert).
- **Output safety:** interviewer/feedback outputs are rendered as text, never as executed code or raw HTML (React auto-escapes; no `dangerouslySetInnerHTML` on AI output).

## 6. Code Execution Sandbox

- Every submission runs in a fresh, network-isolated container with a hard CPU/memory/wall-clock limit (e.g., 5s CPU, 256MB, 10s wall-clock).
- No filesystem persistence between runs; no outbound network access from the sandbox network namespace.
- Sandbox pool runs as a separate, least-privileged worker service — a sandbox escape does not have access to the main database or AI provider keys.
- Submission size limits and language allowlist to prevent resource-exhaustion via absurd inputs.

## 7. Secrets Management

- All secrets (DB URL, Redis URL, AI provider keys, OAuth client secrets, email provider keys) live in environment variables validated by `packages/config`'s zod schema; never committed, never logged.
- Local dev: `.env.local` (gitignored) + `.env.example` with placeholder values checked in.
- CI/CD: GitHub Actions encrypted secrets; production secrets injected at deploy time, distinct from staging.
- No secret ever reaches the client bundle — enforced by convention (only `NEXT_PUBLIC_*` vars are client-visible) and a CI check that greps built client bundles for known secret patterns.

## 8. Data Privacy & Compliance Posture

- User can export all their data (JSON) and request full account deletion (hard-delete after the soft-delete grace period, including object storage cleanup) — GDPR-style right to access/erasure, applied globally rather than gated by jurisdiction.
- PII fields (resume content, email) minimized in logs — log resume/session IDs, not raw content.
- Clear privacy notice on what's sent to third-party AI providers and why.

## 9. Security Headers (baseline)

```
Content-Security-Policy: default-src 'self'; connect-src 'self' <ai-provider-domains>; img-src 'self' data: <object-storage-domain>; script-src 'self'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
```
(Microphone allowed for `self` only, needed for voice interviews.)

## 10. Incident Response

1. Detect (Sentry alert / anomaly in `AIUsageLog` / rate-limit spike / user report).
2. Contain (revoke affected sessions/keys, disable affected route via feature flag).
3. Assess scope (query audit logs for affected users/data).
4. Notify affected users if PII exposure is confirmed, within a reasonable window.
5. Post-incident: root-cause write-up appended to `SECURITY.md`'s changelog, regression test added.

## 11. Pre-Launch Security Checklist (feeds M11)

- [ ] `pnpm audit` clean (no high/critical)
- [ ] All security headers verified in production response
- [ ] Rate limits load-tested
- [ ] Sandbox escape/resource-limit tested against known abuse patterns
- [ ] Secrets scan on repo history (no leaked keys)
- [ ] Access control tests: every resource endpoint tested for cross-user IDOR
- [ ] Privacy policy + ToS reviewed and published
