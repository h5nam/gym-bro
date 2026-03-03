-- Add per-session AI feedback column for bodybuilding agent quick analysis
ALTER TABLE workout_sessions ADD COLUMN ai_session_feedback TEXT;
