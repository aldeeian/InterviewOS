# InterviewOS — Database Design

PostgreSQL 16 + pgvector, managed via Prisma. Conventions: `cuid()` primary keys, `createdAt`/`updatedAt` on every table, soft-delete via `deletedAt` on user-owned content (resumes, notes, sessions) so accidental/user-initiated deletes are recoverable for a grace period before a hard-delete job purges them (supports the GDPR-style erasure requirement while preventing accidental data loss).

## 1. Entity-Relationship Overview

```
User ──< Account (OAuth) 
     ──< Session
     ──< Resume ──< ResumeVersion ──< ResumeEmbedding
     ──< JobDescription ──< JobDescriptionEmbedding
     ──< ResumeJobAnalysis  (Resume × JobDescription)
     ──< InterviewSession ──< InterviewTurn ──< AnswerScore
     ──< Question (generated, links to bank) 
     ──< PracticePlan ──< PracticeGoal
     ──< Note / Flashcard / JournalEntry
     ──< Notification
     ──< Streak
     ──< AIUsageLog

Question ──< QuestionEmbedding
Company ──< CompanyProfile (cached, refreshable)
InterviewSession >── Company (optional target)
InterviewSession >── JobDescription (optional target)
CodeSubmission >── InterviewTurn (for coding-type turns)
```

## 2. Core Tables

### User & Auth
- **User**: id, email (unique), emailVerified, name, image, passwordHash (nullable — null if OAuth-only), timezone, notificationPrefs (json), role (`user`|`admin`), createdAt, updatedAt, deletedAt
- **Account**: id, userId, provider (`google`|`github`), providerAccountId, tokens (encrypted at rest)
- **Session**: id, userId, sessionToken (hashed), expiresAt, userAgent, ipHash — supports "sign out everywhere"
- **PasswordResetToken**: id, userId, tokenHash, expiresAt, usedAt
- **VerificationToken**: id, identifier, tokenHash, expiresAt

### Resume Module
- **Resume**: id, userId, originalFilename, storageKey, mimeType, fileSizeBytes, status (`processing`|`ready`|`failed`), isPrimary
- **ResumeVersion**: id, resumeId, versionNumber, rawText, parsedJson (structured: skills[], experience[], education[], projects[]), atsScore (0-100), overallScore (0-100), improvementSuggestions (json[]), gapFlags (json[])
- **ResumeEmbedding**: id, resumeVersionId, chunkIndex, content, embedding `vector(1536)`

### Job Description Module
- **JobDescription**: id, userId, source (`paste`|`upload`), companyId (nullable), title, rawText, requiredSkills (json[]), preferredSkills (json[]), responsibilities (json[]), technologies (json[]), behavioralExpectations (json[]), difficultyEstimate (`easy`|`medium`|`hard`|`expert`), interviewFocusAreas (json[])
- **JobDescriptionEmbedding**: id, jobDescriptionId, chunkIndex, content, embedding `vector(1536)`

### Resume ↔ JD Analysis
- **ResumeJobAnalysis**: id, userId, resumeVersionId, jobDescriptionId, matchPercentage, missingSkills (json[]), strongSkills (json[]), weakSkills (json[]), atsScore, improvementChecklist (json[]), roadmap (json — ordered prep tasks with topic/priority/estimatedHours)

### Interview Core
- **InterviewSession**: id, userId, type (`behavioral`|`technical`|`coding`|`system_design`|`mixed`), mode (`text`|`voice`), difficulty (`easy`|`medium`|`hard`|`expert`), companyId (nullable), jobDescriptionId (nullable), status (`in_progress`|`completed`|`abandoned`), startedAt, endedAt, overallScore (json — 9-axis rubric), summaryFeedback (text), improvementPlan (json)
- **Question**: id, createdByUserId (nullable — null = seed/system question), sessionId (nullable — nullable = bank question, not yet used), category, subcategory, difficulty, companyTag (nullable), roleTag (nullable), prompt (text), idealAnswerNotes (text, internal), source (`generated`|`seed`|`curated`)
- **QuestionEmbedding**: id, questionId, embedding `vector(1536)`
- **InterviewTurn**: id, sessionId, questionId (nullable — follow-ups may not map to a bank question), turnIndex, role (`interviewer`|`candidate`), content (text), audioStorageKey (nullable, voice mode), followUpOf (nullable self-relation)
- **AnswerScore**: id, turnId, communication, confidence, technicalAccuracy, depth, structure, completeness, grammar, vocabulary, professionalism (all 0-100), rationale (text), improvementNote (text)
- **CodeSubmission**: id, turnId, language, sourceCode (text), stdout, stderr, exitCode, runtimeMs, memoryKb, complexityAnalysis (json), passedVisibleTests, passedHiddenTests, totalVisibleTests, totalHiddenTests

### Company Prep
- **Company**: id, name (unique), slug, logoStorageKey (nullable)
- **CompanyProfile**: id, companyId, overview (text), products (json[]), values (json[]), engineeringCulture (text), likelyTopics (json[]), behavioralQuestionThemes (json[]), prepChecklist (json[]), recentNewsSummary (text, nullable), refreshedAt

### Learning & Analytics
- **Streak**: id, userId, currentStreak, longestStreak, lastPracticeDate
- **PracticePlan**: id, userId, weekStartDate, dailyGoals (json), weeklyGoals (json), focusTopics (json[])
- **TopicMastery**: id, userId, topic, masteryScore (0-100), lastPracticedAt, sessionsCount — feeds radar chart + weak-topic detection
- **AnalyticsEvent**: id, userId, eventType, payload (json), createdAt — append-only, feeds all trend charts

### Notes & Journal
- **Note**: id, userId, sessionId (nullable), title, content (text), tags (json[])
- **Bookmark**: id, userId, questionId
- **Flashcard**: id, userId, front (text), back (text), deck (text), nextReviewAt, easeFactor — spaced repetition (SM-2)
- **JournalEntry**: id, userId, sessionId (nullable), reflection (text), moodRating (nullable)

### Notifications & Ops
- **Notification**: id, userId, type (`daily_reminder`|`practice_reminder`|`interview_countdown`|`weekly_summary`), payload (json), status (`pending`|`sent`|`read`), scheduledFor, sentAt
- **AIUsageLog**: id, userId (nullable), provider, capability (`chat`|`embed`|`stt`|`tts`), promptTokens, completionTokens, latencyMs, estimatedCostUsd, requestId

## 3. Indexing Notes

- Unique: `User.email`, `Company.slug`, `(ResumeVersion.resumeId, versionNumber)`
- HNSW vector indexes on all `*Embedding.embedding` columns (`vector_cosine_ops`)
- B-tree on all foreign keys + `InterviewSession(userId, status)`, `AnalyticsEvent(userId, createdAt)`, `Notification(scheduledFor, status)` for the cron sweep
- Partial index on `Resume(userId) WHERE deletedAt IS NULL` for the common "active resumes" query

## 4. Migration Strategy

- Prisma Migrate, one migration per feature/milestone, never edited after being merged to main — new migrations correct earlier mistakes.
- Seed script (`packages/db/seed.ts`) populates: a demo user, a curated starter question bank (~150 questions across categories), 10–15 well-known company profiles (hand-curated, not scraped), for local dev and E2E fixtures.
