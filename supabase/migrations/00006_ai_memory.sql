-- Add AI coach memory columns to profiles
ALTER TABLE public.profiles ADD COLUMN ai_memory TEXT;
ALTER TABLE public.profiles ADD COLUMN ai_memory_updated_at TIMESTAMPTZ;
