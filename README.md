# Job Tracker

A full-stack job application tracking system with AI-powered resume tailoring.

## Features

- **Application Tracking** — manage job entries with status workflow (Saved → Applied → Phone Screen → Technical → Onsite → Offer → Accepted/Rejected)
- **AI Resume Tailoring** — tailor your resume to a specific job description using Claude AI; export as PDF and DOCX
- **Cover Letter Generation** — auto-generate a cover letter per job entry
- **Per-Application Chat** — context-aware chat for interview prep, using the job description, your resume, and your notes
- **Dashboard Visualizations** — application funnel, state/location map, Remote/Hybrid/Onsite breakdown
- **Admin Interface** — monitor fetch success rates, user activity, and system usage
- **CSV Export** — export your application data for your own analysis

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui
- **Database + Auth + Storage**: Supabase
- **AI**: Anthropic Claude API
- **Charts**: Recharts + react-simple-maps
- **Hosting**: Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase and Anthropic API keys
npm run dev
```

## Environment Variables

See `.env.example` for required variables.
