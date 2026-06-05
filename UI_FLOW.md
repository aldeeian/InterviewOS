# InterviewOS — UI Flow

## 1. Sitemap

```
/                          Marketing landing (logged out)
/login  /signup  /reset-password
/dashboard                 Home after login
/resumes                   List + upload
/resumes/:id                Detail: parsed data, score, suggestions, versions
/jobs                       Job description list + paste/upload
/jobs/:id                   Detail: extracted fields
/jobs/:id/analysis           Resume↔JD match, gaps, roadmap
/practice                   Interview generator / start a session
/practice/:sessionId         Live session (text/voice/coding, mode-dependent layout)
/practice/:sessionId/feedback  Post-session scorecard + improvement plan
/companies                  Browse/search
/companies/:slug             Company prep profile
/learning                   Learning Center: plans, goals, recommendations
/analytics                  Trends, radar chart, mastery, timeline
/notes  /flashcards  /journal
/settings/profile  /settings/security  /settings/notifications
```

## 2. Primary User Flows

### 2.1 Onboarding (first session after signup)
```
Signup/OAuth ─▶ Welcome (role + experience level + target timeline) 
            ─▶ "Upload your resume" (skippable) 
            ─▶ "Paste a target job description" (skippable) 
            ─▶ Dashboard, pre-seeded with a recommended first practice session
```
Skippable at every step — a user must be able to reach the dashboard and start practicing with zero setup (uses generic questions if no resume/JD yet).

### 2.2 Resume Upload & Analysis
```
/resumes ─▶ [Upload] ─▶ processing state (progress indicator, polling /status)
        ─▶ ready: parsed panel (skills/experience/education/projects) 
                  + score ring (ATS + overall) 
                  + improvement suggestions list (actionable, linkable to Learning Center)
        ─▶ [Set as primary] / [Upload new version] / [Compare versions]
```

### 2.3 Job Description → Roadmap
```
/jobs ─▶ [Paste text | Upload PDF] ─▶ processing 
      ─▶ ready: extracted requirements panel 
      ─▶ [Analyze against resume] ─▶ picks primary/other resume 
      ─▶ /jobs/:id/analysis: match % ring, missing/strong/weak skill chips, 
         ATS score, checklist (checkable items), generated roadmap (ordered, 
         each item links to a practice session pre-configured for that gap)
```

### 2.4 Practice Session Setup
```
/practice ─▶ pick: category (behavioral/technical/coding/system design/mixed) 
                  × difficulty (easy/med/hard/expert) 
                  × target (generic | company | specific JD) 
                  × mode (text | voice)
         ─▶ [Start] ─▶ /practice/:sessionId
```

### 2.5 AI Interviewer (text/voice)
```
Session view:
┌─────────────────────────────┬───────────────┐
│ Conversation transcript      │ Session info   │
│ (streaming interviewer text  │ - timer        │
│  or voice waveform + partial │ - question #   │
│  transcript)                 │ - live score   │
│                               │   preview      │
│ [Candidate input: textarea    │ - end session  │
│  or mic button]               │   button       │
└─────────────────────────────┴───────────────┘
```
Flow: interviewer asks → candidate answers (typed or spoken) → streamed follow-up or next question, with an inline "scoring…" indicator that resolves to a small live score chip per answer → repeat → [End Session] → feedback page.

### 2.6 Coding Interview (variant layout)
```
┌───────────────────┬────────────────────────┐
│ Problem statement   │ Monaco editor          │
│ + constraints        │ language picker        │
│ + hints (collapsed)  │ [Run] [Submit]         │
├───────────────────┤ visible test results   │
│ Interviewer notes/   │ (hidden tests revealed │
│ follow-up questions  │  post-submit with pass │
│                       │  summary + complexity  │
│                       │  analysis)             │
└───────────────────┴────────────────────────┘
```

### 2.7 Post-Session Feedback
```
/practice/:id/feedback:
  Radar chart (9 axes) at top
  Per-axis score + one-line rationale
  "What to work on next" — ranked improvement plan, each item deep-links to 
    a relevant Learning Center resource or a pre-configured next practice session
  [Save note] [Add flashcards from missed concepts] [Schedule follow-up]
```

### 2.8 Dashboard (return visits)
```
Top: streak + "continue where you left off" recommendation
Row: upcoming interview countdown (if a target date set) | weak topics | recent sessions
Row: progress chart (last 30 days) | saved jobs
```

### 2.9 Company Prep
```
/companies ─▶ search/browse ─▶ /companies/:slug
  Overview | Products | Values | Engineering culture
  Likely topics (chips, linkable to filtered practice)
  Behavioral question themes
  Prep checklist (checkable, persists per-user)
  [Start company-specific practice session]
```

## 3. Navigation Structure

- Persistent left sidebar (desktop) / bottom nav + drawer (mobile): Dashboard, Practice, Resumes, Jobs, Companies, Learning, Analytics, Notes.
- Top bar: search (jump to company/question), notifications bell, profile menu.
- Every generated artifact (question, score, suggestion) is deep-linkable and shareable within the app (not externally, per no-public-leaderboard-by-default stance).

## 4. Accessibility & Responsive Notes

- All interactive session controls (mic button, run/submit, end session) reachable and operable via keyboard.
- Live-updating regions (streaming transcript, score chips) use `aria-live="polite"` so screen readers announce updates without interrupting.
- Mobile layout collapses the two-column session views to a tabbed single column (Conversation / Info, or Problem / Editor) below 768px.
- Color is never the sole signal for score/status — icons + text labels accompany every color-coded element (radar chart, checklist, match %).
