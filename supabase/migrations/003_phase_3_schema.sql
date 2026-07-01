-- ============================================================
-- 003_phase_3_schema.sql
-- Resume management, tailored docs, cover letters, API usage logs
-- + Supabase Storage buckets and policies
-- ============================================================

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('resumes', 'resumes', false)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('tailored', 'tailored', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: resumes bucket
CREATE POLICY "Users upload own resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own resumes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: tailored bucket
CREATE POLICY "Users upload own tailored files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tailored' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own tailored files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tailored' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own tailored files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tailored' AND (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------
-- resumes: user-uploaded source resumes
-- -------------------------------------------------------
CREATE TABLE public.resumes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  mime_type    TEXT NOT NULL DEFAULT 'application/pdf',
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own resumes"
  ON public.resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own resumes"
  ON public.resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own resumes"
  ON public.resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own resumes"
  ON public.resumes FOR DELETE USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- tailored_resumes: AI-generated resume per application
-- -------------------------------------------------------
CREATE TABLE public.tailored_resumes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  source_resume_id  UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_json       JSONB,
  pdf_path          TEXT,
  docx_path         TEXT,
  pdf_url           TEXT,
  docx_url          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tailored resumes"
  ON public.tailored_resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tailored resumes"
  ON public.tailored_resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own tailored resumes"
  ON public.tailored_resumes FOR DELETE USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- cover_letters: AI-generated cover letter per application
-- -------------------------------------------------------
CREATE TABLE public.cover_letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  pdf_path        TEXT,
  docx_path       TEXT,
  pdf_url         TEXT,
  docx_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cover letters"
  ON public.cover_letters FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cover letters"
  ON public.cover_letters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own cover letters"
  ON public.cover_letters FOR DELETE USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- api_usage_logs: every Claude API call (for admin Phase 5)
-- -------------------------------------------------------
CREATE TYPE public.api_action AS ENUM ('jd_parse', 'resume_tailor', 'cover_letter', 'chat');

CREATE TABLE public.api_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type     public.api_action NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  model           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api logs"
  ON public.api_usage_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert api logs"
  ON public.api_usage_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view all api logs"
  ON public.api_usage_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
