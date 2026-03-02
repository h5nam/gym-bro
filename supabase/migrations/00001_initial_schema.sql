-- ============================================
-- Agentic Fitness Coach — Core Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '사용자',
  height_cm NUMERIC(5,1),
  birth_year INTEGER,
  training_goal TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- DATA SOURCES
-- ============================================
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  credentials_encrypted TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- EXERCISE CATALOG
-- ============================================
CREATE TABLE public.exercise_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  muscle_group_primary TEXT NOT NULL,
  muscle_groups_secondary TEXT[],
  equipment TEXT,
  movement_pattern TEXT,
  is_compound BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES public.exercise_catalog(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'garmin',
  UNIQUE(alias, source)
);

-- ============================================
-- WORKOUT SESSIONS
-- ============================================
CREATE TABLE public.workout_sessions_raw (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES public.data_sources(id),
  source_activity_id TEXT,
  raw_payload JSONB NOT NULL,
  exercise_sets_payload JSONB,
  activity_type TEXT,
  started_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data_source_id, source_activity_id)
);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_session_id UUID REFERENCES public.workout_sessions_raw(id),
  session_name TEXT NOT NULL,
  muscle_groups TEXT[] NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  total_volume_kg NUMERIC(10,1),
  total_sets INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  notes TEXT,
  ai_normalized_at TIMESTAMPTZ,
  user_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercise_catalog(id),
  exercise_name_raw TEXT,
  exercise_name_display TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg NUMERIC(6,1) NOT NULL,
  rpe NUMERIC(3,1),
  is_warmup BOOLEAN DEFAULT false,
  rest_seconds INTEGER,
  set_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CORRECTION HISTORY
-- ============================================
CREATE TABLE public.correction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  corrections_applied JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MEAL LOGS
-- ============================================
CREATE TABLE public.meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  raw_text TEXT NOT NULL,
  parsed_items JSONB NOT NULL,
  total_calories INTEGER,
  total_protein_g NUMERIC(6,1),
  total_carbs_g NUMERIC(6,1),
  total_fat_g NUMERIC(6,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- BODY METRICS
-- ============================================
CREATE TABLE public.body_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,1),
  bmi NUMERIC(4,1),
  skeletal_muscle_mass_kg NUMERIC(5,1),
  body_water_pct NUMERIC(4,1),
  source TEXT DEFAULT 'manual',
  raw_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own data_sources" ON public.data_sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own raw sessions" ON public.workout_sessions_raw FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own sets" ON public.workout_sets FOR ALL USING (
  session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users own corrections" ON public.correction_history FOR ALL USING (
  session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users own meals" ON public.meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own metrics" ON public.body_metrics FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sets_session ON public.workout_sets(session_id, set_order);
CREATE INDEX idx_meal_logs_user_date ON public.meal_logs(user_id, meal_date DESC);
CREATE INDEX idx_body_metrics_user_date ON public.body_metrics(user_id, measured_at DESC);
CREATE INDEX idx_exercise_aliases_alias ON public.exercise_aliases(alias);
CREATE INDEX idx_raw_sessions_source ON public.workout_sessions_raw(data_source_id, source_activity_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', '사용자'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
