-- Add tomorrow_plan JSONB column to daily_reports
ALTER TABLE public.daily_reports
  ADD COLUMN tomorrow_plan JSONB;

-- Update coach_personas model to gemini-3-flash-preview
UPDATE public.coach_personas
  SET model = 'gemini-3-flash-preview'
  WHERE model = 'gemini-2.5-flash';
