-- ============================================
-- AI Agent Tables
-- ============================================

CREATE TABLE public.coach_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL UNIQUE,
  display_name_ko TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_session_id UUID REFERENCES public.workout_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  total_tokens_used INTEGER,
  total_cost_usd NUMERIC(8,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('positive', 'warning', 'suggestion', 'concern')),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 10),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_points JSONB,
  included_in_report BOOLEAN DEFAULT false,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.analysis_jobs(id),
  report_date DATE NOT NULL,
  workout_summary TEXT,
  nutrition_summary TEXT,
  coaching_highlights JSONB,
  action_items JSONB,
  full_report TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_date)
);

CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.analysis_jobs(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  volume_by_muscle_group JSONB,
  progressive_overload_data JSONB,
  body_metrics_trend JSONB,
  full_report TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- RLS
ALTER TABLE public.coach_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read personas" ON public.coach_personas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users own jobs" ON public.analysis_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own feedback" ON public.agent_feedback
  FOR ALL USING (
    job_id IN (SELECT id FROM public.analysis_jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users own daily reports" ON public.daily_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own weekly reports" ON public.weekly_reports
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_analysis_jobs_user ON public.analysis_jobs(user_id, created_at DESC);
CREATE INDEX idx_agent_feedback_job ON public.agent_feedback(job_id);
CREATE INDEX idx_daily_reports_user_date ON public.daily_reports(user_id, report_date DESC);
CREATE INDEX idx_weekly_reports_user_week ON public.weekly_reports(user_id, week_start DESC);

-- ============================================
-- Seed Coach Personas
-- ============================================
INSERT INTO public.coach_personas (agent_name, display_name_ko, system_prompt, model) VALUES
('bodybuilding', '보디빌딩 코치', '당신은 전문 보디빌딩 코치입니다. 사용자의 운동 데이터를 분석하여 볼륨, 점진적 과부하, 부위별 분할, 운동 선택에 대한 피드백을 제공합니다. 한국어로 응답하세요.', 'gemini-2.5-flash'),
('sports_med', '스포츠의학 코치', '당신은 스포츠의학 전문가입니다. 사용자의 운동 패턴을 분석하여 관절 부담, 과사용 위험, 부상 예방, 회복 리스크에 대한 피드백을 제공합니다. 의료 진단이 아닌 일반적인 운동 안전 조언만 제공하세요. 한국어로 응답하세요.', 'gemini-2.5-flash'),
('nutrition', '영양 코치', '당신은 스포츠 영양 전문가입니다. 사용자의 식단과 운동량을 비교 분석하여 에너지 섭취, 단백질 적정성, 탄수화물/지방 균형에 대한 피드백을 제공합니다. 극단적인 식단을 권장하지 마세요. 한국어로 응답하세요.', 'gemini-2.5-flash'),
('recovery', '회복 코치', '당신은 회복 및 컨디셔닝 전문가입니다. 사용자의 운동 빈도, 부위별 휴식일, 수면 패턴, 피로도를 분석하여 회복 최적화에 대한 피드백을 제공합니다. 한국어로 응답하세요.', 'gemini-2.5-flash');
