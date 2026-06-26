# Software Requirements Specification (SRS)
## Job Tracker — AI-Powered Job Application Management System

**Version:** 1.0  
**Date:** June 2026  
**Author:** Parikshit Talaviya  
**Repository:** https://github.com/parikshittalaviya/job-tracker

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Classes](#3-user-classes)
4. [Tech Stack](#4-tech-stack)
5. [Database Schema](#5-database-schema)
6. [Phase-wise Functional Requirements](#6-phase-wise-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Branch Strategy](#8-branch-strategy)
9. [API Overview](#9-api-overview)
10. [Future Phases](#10-future-phases)

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete software requirements for the Job Tracker application — a multi-user, AI-assisted web platform to manage job applications, tailor resumes, generate cover letters, prepare for interviews, and visualize the job hunt pipeline.

### 1.2 Scope
The system allows registered users to:
- Track job applications from discovery to final outcome
- Automatically or manually input job descriptions
- Use AI (Claude API) to tailor their resume and generate a cover letter per job
- Engage in a per-application AI chat session for interview preparation
- Visualize their application pipeline via dashboards
- Export data to CSV

An admin role provides system-level monitoring of fetch effectiveness, user activity, and API usage.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| JD | Job Description |
| Tailoring | AI-rewriting of a resume to match a specific JD |
| Entry | A single job application record |
| Fetch | Attempt to scrape job details from a provided URL |
| RLS | Row Level Security (Supabase feature for user data isolation) |
| MVP | Minimum Viable Product |

### 1.4 Target Users
- Primary: Parikshit and friends (job-seeking students/graduates)
- Secondary: Any job seeker who signs up on the hosted platform

---

## 2. Overall Description

### 2.1 Product Perspective
A hosted, full-stack web application accessible via browser. Each user has a private, isolated account. AI features are powered by the Anthropic Claude API. Storage (resumes, generated files) is handled via Supabase Storage. The system is hosted on Vercel with a Supabase backend.

### 2.2 Assumptions and Constraints
- Job sites (LinkedIn, Workday, etc.) may block HTTP fetch; manual paste is always the fallback and is required input.
- AI resume tailoring costs money — users get 3 free tailorings/day; additional usage requires their own Anthropic API key stored in their profile.
- LinkedIn and Gmail integrations are out of scope for MVP (Phase 7 and 8).
- The system is multi-tenant; all data is user-scoped via Supabase Row Level Security.

---

## 3. User Classes

### 3.1 Regular User
- Can register, log in, and manage their own data only
- Can upload resumes, create job entries, use AI tailoring
- Has a personal dashboard with their application stats
- Can export their own data to CSV

### 3.2 Admin
- Promoted via a `role` flag in the database (not self-assignable)
- Can view all users and their activity
- Can monitor HTTP fetch success/failure logs
- Can view system-wide API usage statistics
- Can export system-wide data to CSV
- Has access to an `/admin` dashboard route (protected)

---

## 4. Tech Stack

### 4.1 Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | Full-stack React framework |
| TypeScript | Type safety across frontend and backend |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Pre-built accessible UI components |
| Recharts | Application funnel, pie charts, bar charts |
| react-simple-maps | US state-level application heatmap |

### 4.2 Backend (Next.js API Routes)
| Technology | Purpose |
|---|---|
| Next.js API Routes | Server-side logic, AI calls, file generation |
| node-fetch | HTTP fetch attempt on job URLs |
| cheerio | HTML parsing for scraped job pages |
| Anthropic Claude SDK | Resume tailoring, JD parsing, cover letter, chat |
| pdfmake | Server-side PDF generation |
| docx (npm) | Server-side Word (.docx) file generation |

### 4.3 Database, Auth, Storage
| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database with Row Level Security |
| Supabase Auth | User authentication (email/password) |
| Supabase Storage | File storage for resumes (original + tailored) |

### 4.4 Hosting & DevOps
| Technology | Purpose |
|---|---|
| Vercel | Frontend + API hosting (free tier) |
| GitHub | Version control, branch-per-phase strategy |
| Supabase | Database + auth + storage hosting (free tier) |

### 4.5 AI Model
- **Model**: Claude Sonnet (latest) via Anthropic API
- **Used for**: JD field extraction, resume tailoring, cover letter generation, per-application chat
- **Rate limit**: 3 free tailoring/cover letter generations per user per day (app-funded); unlimited with user's own API key stored in profile

---

## 5. Database Schema

### 5.1 `profiles` (extends Supabase `auth.users`)
```
id              uuid PRIMARY KEY (references auth.users)
full_name       text
avatar_url      text
anthropic_key   text (encrypted at app level)
role            text DEFAULT 'user' CHECK (role IN ('user', 'admin'))
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### 5.2 `resumes`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
name            text
file_path       text (Supabase Storage path)
file_url        text (public URL)
is_default      boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### 5.3 `job_applications`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
job_link        text NOT NULL
company_name    text
job_title       text
location        text
state           text
country         text DEFAULT 'USA'
work_type       text CHECK (work_type IN ('remote', 'hybrid', 'onsite', 'unknown'))
pay_min         numeric
pay_max         numeric
pay_currency    text DEFAULT 'USD'
h1_sponsor      text CHECK (h1_sponsor IN ('yes', 'no', 'unknown')) DEFAULT 'unknown'
job_description text NOT NULL
job_id_external text
requirements    jsonb
deadline        date
status          text DEFAULT 'saved' CHECK (status IN ('saved','applied','phone_screen','technical','onsite','offer','accepted','rejected'))
fetch_status    text DEFAULT 'pending' CHECK (fetch_status IN ('pending','success','failed'))
applied_at      timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### 5.4 `application_notes`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
application_id  uuid REFERENCES job_applications(id) ON DELETE CASCADE
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
content         text NOT NULL
created_at      timestamptz DEFAULT now()
```

### 5.5 `tailored_resumes`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
application_id  uuid REFERENCES job_applications(id) ON DELETE CASCADE
source_resume_id uuid REFERENCES resumes(id)
pdf_path        text
docx_path       text
pdf_url         text
docx_url        text
created_at      timestamptz DEFAULT now()
```

### 5.6 `cover_letters`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
application_id  uuid REFERENCES job_applications(id) ON DELETE CASCADE
content         text
pdf_path        text
docx_path       text
pdf_url         text
docx_url        text
created_at      timestamptz DEFAULT now()
```

### 5.7 `chat_messages`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
application_id  uuid REFERENCES job_applications(id) ON DELETE CASCADE
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
role            text CHECK (role IN ('user', 'assistant'))
content         text NOT NULL
created_at      timestamptz DEFAULT now()
```

### 5.8 `fetch_logs` (admin visibility)
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
application_id  uuid REFERENCES job_applications(id) ON DELETE SET NULL
user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL
url             text
status          text CHECK (status IN ('success', 'failed'))
error_message   text
attempted_at    timestamptz DEFAULT now()
```

### 5.9 `tailoring_usage` (rate limiting)
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
usage_date      date DEFAULT CURRENT_DATE
count           integer DEFAULT 0
UNIQUE (user_id, usage_date)
```

### 5.10 `api_usage_logs`
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL
action_type     text CHECK (action_type IN ('jd_parse','resume_tailor','cover_letter','chat'))
input_tokens    integer
output_tokens   integer
model           text
created_at      timestamptz DEFAULT now()
```

---

## 6. Phase-wise Functional Requirements

---

### Phase 1 — Project Setup + Authentication
**Branch:** `feature/phase-1-setup`  
**Goal:** Working Next.js app with Supabase auth, protected routes, and user profile.

#### FR-1.1 Project Scaffold
- Initialize Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui
- Configure Supabase client (server + client side)
- Set up environment variables structure (`.env.example`)
- Configure ESLint + Prettier

#### FR-1.2 Authentication
- Email/password sign up and sign in
- Email verification on sign up
- Password reset via email
- Protected routes (redirect unauthenticated users to `/login`)
- Auth state management via Supabase Auth helpers for Next.js

#### FR-1.3 User Profile
- Profile page at `/profile`
- Fields: Full name, avatar (upload optional), Anthropic API key (masked input, stored encrypted)
- Show current daily tailoring usage (X / 3 free used today)
- Resume management sub-section (see Phase 3)

#### FR-1.4 Navigation
- Sidebar or top navigation: Dashboard, Applications, Profile
- Admin-only nav item: Admin Panel (visible only to `role = admin`)

---

### Phase 2 — Job Entry Management
**Branch:** `feature/phase-2-job-entries`  
**Goal:** Full CRUD for job applications with AI-powered JD parsing.

#### FR-2.1 Create Job Entry
- Form fields:
  - Job Link (required, URL validated)
  - Job Description (required, large textarea)
  - Deadline (optional, date picker)
- On submit:
  1. System attempts HTTP fetch of the job link
  2. Log result to `fetch_logs` (success/failed)
  3. If fetch succeeds, use scraped content + user's pasted JD
  4. If fetch fails, use user's pasted JD only
  5. Call Claude API to extract structured fields from the JD:
     - Job title, company name, location, state, work type
     - Pay range (min/max/currency)
     - H1 sponsorship (yes/no/unknown — inferred from JD text)
     - Requirements (list)
     - External job ID (if present in URL or JD)
  6. Save all extracted fields to `job_applications`
  7. Set `fetch_status` = 'success' or 'failed'

#### FR-2.2 View Job Entry
- Detail page at `/applications/[id]`
- Display all parsed fields in a clean card layout
- Show status badge with color coding
- Display deadline with urgency highlight (red if < 3 days away)
- Tabs within the entry page:
  - **Overview** — all JD fields
  - **Resume & Cover Letter** — tailored docs (Phase 3)
  - **Notes** — activity log
  - **Chat** — interview prep (Phase 6)

#### FR-2.3 Edit Job Entry
- Edit any manually-entered or AI-extracted field
- Re-run AI extraction on updated JD (optional button)
- Update status via dropdown

#### FR-2.4 Delete Job Entry
- Soft confirmation dialog before delete
- Cascade deletes: notes, chat messages, tailored resumes, cover letters, fetch logs

#### FR-2.5 Applications List Page
- Route: `/applications`
- Table/card view of all entries
- Columns: Company, Role, Location, Work Type, Status, Deadline, Applied Date
- Filters: Status, Work Type, State/Location, H1 Sponsor
- Search: by company name or job title
- Sort: by created date, deadline, status
- Status badge with color:
  - Saved (gray), Applied (blue), Phone Screen (yellow), Technical (orange), Onsite (purple), Offer (green), Accepted (emerald), Rejected (red)

#### FR-2.6 Notes & Activity Log
- Add timestamped notes to any entry
- Notes displayed as a timeline
- Notes feed into the per-application chat context (Phase 6)

---

### Phase 3 — Resume Tailoring + Cover Letter
**Branch:** `feature/phase-3-resume-ai`  
**Goal:** AI-powered resume tailoring and cover letter generation with file exports.

#### FR-3.1 Resume Upload (in Profile)
- Upload PDF or DOCX resumes
- Name each resume (e.g., "General Resume", "SDE Resume")
- Mark one as default
- Store in Supabase Storage under `resumes/{user_id}/`
- List uploaded resumes with delete option

#### FR-3.2 Trigger Tailoring from Job Entry
- On the Resume & Cover Letter tab of an entry:
  - Show prompt: "Select a resume to tailor" (dropdown of uploaded resumes, default pre-selected)
  - Option: "Upload a new resume for this job" (one-time upload, also saved to profile)
  - Button: "Tailor Resume + Generate Cover Letter"

#### FR-3.3 Rate Limiting
- Check `tailoring_usage` for today's count for the user
- If count < 3 AND user has no personal API key: use app's API key, increment count
- If count >= 3 AND no personal key: show message "Daily free limit reached. Add your Anthropic API key in Profile to continue."
- If user has personal API key: always use their key (no limit enforced)

#### FR-3.4 AI Resume Tailoring
- Send to Claude API:
  - System prompt: expert resume writer, ATS optimization focus
  - User's resume content (extracted from uploaded PDF/DOCX)
  - The job description
  - Instructions: rewrite bullet points to align with JD keywords, reorder sections by relevance, keep factual accuracy, do not fabricate experience
- Receive tailored resume text
- Generate PDF (pdfmake) and DOCX (docx) from the tailored content
- Store both files in Supabase Storage under `tailored/{user_id}/{application_id}/`
- Save paths and URLs to `tailored_resumes`

#### FR-3.5 AI Cover Letter Generation
- Generated alongside resume tailoring (same API call or sequential)
- Send to Claude: JD + resume + user's name + company name
- Output: professional cover letter (3–4 paragraphs)
- Generate PDF + DOCX
- Store in `cover_letters`

#### FR-3.6 Download
- Show download buttons for PDF and DOCX for both tailored resume and cover letter
- Show generation timestamp
- Allow re-generating (counts as another tailoring use)

---

### Phase 4 — Dashboard + Visualizations
**Branch:** `feature/phase-4-dashboard`  
**Goal:** Home page with rich visual summaries of the application pipeline.

#### FR-4.1 Dashboard Route
- Route: `/dashboard` (default landing after login)
- Shows a summary of the user's full application history

#### FR-4.2 Application Funnel Chart
- Horizontal funnel or bar chart showing count at each status stage
- Stages: Saved → Applied → Phone Screen → Technical → Onsite → Offer → Accepted
- Rejected shown as a separate stat card (hidden by default behind "Show All Stats" toggle)

#### FR-4.3 US State Heatmap
- react-simple-maps choropleth of US states
- Color intensity = number of applications to that state
- Tooltip: state name + count + breakdown (Remote/Hybrid/Onsite)
- Remote-only jobs shown in a separate counter (not pinned to a state)

#### FR-4.4 Work Type Breakdown
- Pie or donut chart: Remote / Hybrid / Onsite percentages

#### FR-4.5 H1 Sponsorship Breakdown
- Pie chart: Yes / No / Unknown — useful for international students

#### FR-4.6 Application Timeline
- Line or area chart: applications submitted per week/month
- Helps track effort over time

#### FR-4.7 Deadline Alerts
- Card on the dashboard listing upcoming deadlines (within 7 days)
- Color-coded: red (< 3 days), yellow (3–7 days)

#### FR-4.8 Recent Activity
- Last 5 updated applications shown as a quick-access list

#### FR-4.9 Rejected Counter (Easter Egg)
- Hidden behind a toggle button labeled "How bad is it really?"
- Shows rejected count with a humorous UI treatment

---

### Phase 5 — Admin Interface
**Branch:** `feature/phase-5-admin`  
**Goal:** System monitoring and management for the admin user.

#### FR-5.1 Access Control
- Route: `/admin` — accessible only to users with `role = 'admin'`
- Middleware redirect to `/dashboard` for non-admins

#### FR-5.2 Fetch Effectiveness Monitor
- Table of all fetch attempts with: URL, user, timestamp, status (success/failed), error message
- Summary stats: total attempts, success rate (%), top failing domains
- Filter by: date range, status, domain

#### FR-5.3 User Management
- List all registered users: name, email, join date, total applications, tailoring usage
- Ability to promote/demote user to admin (toggle)
- View any user's application count and API usage (not their actual data)

#### FR-5.4 API Usage Stats
- Total Claude API calls by action type (jd_parse / resume_tailor / cover_letter / chat)
- Token usage over time (line chart)
- Per-user breakdown of tailoring usage
- Daily free-tier usage across all users (to monitor app-funded cost)

#### FR-5.5 System-wide CSV Export
- Export all fetch logs
- Export all user activity summary (no PII beyond name/email)
- Export API usage logs

---

### Phase 6 — Per-Application Chat (Interview Prep)
**Branch:** `feature/phase-6-chat`  
**Goal:** Context-aware AI chat assistant per job entry for interview preparation.

#### FR-6.1 Chat Interface
- Located in the Chat tab of each job entry detail page
- Full-page chat UI with message history
- Streaming responses (Server-Sent Events)

#### FR-6.2 Chat Context
- System prompt automatically includes:
  - Job title and company
  - Full job description
  - User's tailored resume content (if generated) or base resume
  - All notes/activity log entries for this application
  - Application status and timeline
- User is not required to re-explain the context

#### FR-6.3 Interview Prep Features
The chat can naturally handle:
- "Generate 10 likely interview questions for this role"
- "How should I answer questions about X given my resume?"
- "What are the key skills I should highlight?"
- "Draft a follow-up email after my phone screen"
- "Explain what [technical term from JD] means"
- "Create a 30-60-90 day plan for this role"

#### FR-6.4 Chat Persistence
- All messages stored in `chat_messages`
- Chat history loads on return to the tab
- Each new message appended to history

#### FR-6.5 Rate / Cost
- Chat uses the same API key logic (user's key preferred; falls back to app key)
- Chat calls are logged in `api_usage_logs` with action_type = 'chat'
- No daily limit on chat (separate from tailoring limit) — but logged for admin visibility

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Page load < 2 seconds on standard broadband
- AI responses streamed — first token within 1.5 seconds
- Dashboard charts render client-side from pre-fetched data

### 7.2 Security
- All database queries use Supabase RLS — users can only read/write their own rows
- Anthropic API keys stored encrypted (AES-256) at application level before saving to DB
- Environment variables never exposed to client-side code
- Input sanitization on all user-facing text fields
- Admin routes protected by both auth middleware and role check

### 7.3 Scalability
- Stateless API routes — horizontally scalable on Vercel
- Supabase free tier supports up to 500MB DB and 1GB storage (sufficient for MVP)
- Upgrade path: Supabase Pro ($25/month) when needed

### 7.4 Usability
- Fully responsive — works on desktop and tablet
- Empty states with helpful prompts (no blank screens)
- Loading skeletons for async content
- Toast notifications for async action results (success/error)
- Accessible components via shadcn/ui (ARIA labels, keyboard nav)

### 7.5 Availability
- Vercel free tier: 99.9% uptime SLA
- No custom uptime requirement for MVP

---

## 8. Branch Strategy

```
main
│   Stable, always deployable. Merged from dev after each phase is complete.
│
dev
│   Integration branch. All phase branches merge here first.
│
├── feature/phase-1-setup
│   Next.js scaffold, Supabase config, auth, profile, navigation
│
├── feature/phase-2-job-entries
│   Job entry CRUD, HTTP fetch + logging, AI JD parsing, status workflow, notes
│
├── feature/phase-3-resume-ai
│   Resume upload, AI tailoring, cover letter, PDF/DOCX export, rate limiting
│
├── feature/phase-4-dashboard
│   Home dashboard, all charts and visualizations, deadline alerts
│
├── feature/phase-5-admin
│   Admin panel, fetch logs, user management, API usage stats
│
└── feature/phase-6-chat
    Per-application chat, streaming, context injection, message persistence
```

**Workflow per phase:**
1. Checkout `feature/phase-X` from `dev`
2. Build and commit incrementally
3. Open Pull Request: `feature/phase-X` → `dev`
4. Review + merge to `dev`
5. After phase is stable on `dev`, merge `dev` → `main`

---

## 9. API Overview

All routes under `/api/`

### Auth (handled by Supabase — no custom routes needed)

### Job Applications
| Method | Route | Description |
|---|---|---|
| GET | `/api/applications` | List user's applications (with filters) |
| POST | `/api/applications` | Create new entry (triggers fetch + AI parse) |
| GET | `/api/applications/[id]` | Get single entry |
| PATCH | `/api/applications/[id]` | Update entry fields or status |
| DELETE | `/api/applications/[id]` | Delete entry and cascade |

### Resume & AI
| Method | Route | Description |
|---|---|---|
| POST | `/api/resumes/upload` | Upload a resume file |
| DELETE | `/api/resumes/[id]` | Delete a resume |
| POST | `/api/applications/[id]/tailor` | Trigger tailoring + cover letter generation |
| GET | `/api/applications/[id]/tailor` | Get tailored resume and cover letter URLs |

### Chat
| Method | Route | Description |
|---|---|---|
| GET | `/api/applications/[id]/chat` | Get chat history |
| POST | `/api/applications/[id]/chat` | Send message (streaming response) |

### Notes
| Method | Route | Description |
|---|---|---|
| GET | `/api/applications/[id]/notes` | Get all notes |
| POST | `/api/applications/[id]/notes` | Add a note |
| DELETE | `/api/notes/[id]` | Delete a note |

### Admin
| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/[id]` | Update user role |
| GET | `/api/admin/fetch-logs` | Get fetch logs with filters |
| GET | `/api/admin/api-usage` | Get API usage stats |
| GET | `/api/admin/export` | CSV export (fetch logs / usage) |

### User
| Method | Route | Description |
|---|---|---|
| GET | `/api/profile` | Get current user profile |
| PATCH | `/api/profile` | Update profile (name, API key) |
| GET | `/api/profile/usage` | Get today's tailoring count |
| GET | `/api/export` | Export user's applications as CSV |

---

## 10. Future Phases

### Phase 7 — LinkedIn Integration
- Find people working at a target company
- Surface alumni or easy-to-approach contacts
- Draft personalized outreach/referral messages
- Note: Subject to LinkedIn API availability and ToS

### Phase 8 — Gmail Integration
- Connect Gmail via Google OAuth
- Auto-scan emails to update application status
- Surface urgent emails (interviews, offers) on dashboard
- Parse and log interview scheduling emails

---

*This document is a living specification. It will be updated as decisions are made during development.*
