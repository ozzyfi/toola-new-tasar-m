ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contribution_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge text DEFAULT 'yeni';

ALTER TABLE public.learning_cases
ADD COLUMN IF NOT EXISTS discovered_by_name text;

ALTER TABLE public.technicians
ADD COLUMN IF NOT EXISTS contribution_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge text DEFAULT 'yeni';