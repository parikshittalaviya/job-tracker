-- ============================================================
-- 002_phase_2_schema.sql
-- Job applications, notes, fetch logs + tailoring_usage policies
-- ============================================================

-- Patch missing policies on tailoring_usage (from migration 001)
CREATE POLICY "Users can insert own tailoring usage"
  ON public.tailoring_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tailoring usage"
  ON public.tailoring_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TYPE public.app_status AS ENUM (
  'saved', 'applied', 'phone_screen', 'technical', 'onsite',
  'offer', 'accepted', 'rejected'
);

CREATE TYPE public.work_type AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE public.fetch_status AS ENUM ('success', 'failed');

-- Core job applications table
CREATE TABLE public.job_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url              TEXT,
  job_description  TEXT NOT NULL,
  company          TEXT,
  role             TEXT,
  location         TEXT,
  work_type        public.work_type,
  salary_min       INTEGER,
  salary_max       INTEGER,
  salary_currency  TEXT DEFAULT 'USD',
  h1_sponsor       BOOLEAN,
  requirements     TEXT[],
  deadline         DATE,
  status           public.app_status NOT NULL DEFAULT 'saved',
  ai_extracted     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON public.job_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Notes per application
CREATE TABLE public.application_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON public.application_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON public.application_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.application_notes FOR DELETE
  USING (auth.uid() = user_id);

-- HTTP fetch logs (for admin visibility)
CREATE TABLE public.fetch_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  status           public.fetch_status NOT NULL,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fetch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fetch logs"
  ON public.fetch_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fetch logs"
  ON public.fetch_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all fetch logs"
  ON public.fetch_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at on job_applications
CREATE TRIGGER job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
