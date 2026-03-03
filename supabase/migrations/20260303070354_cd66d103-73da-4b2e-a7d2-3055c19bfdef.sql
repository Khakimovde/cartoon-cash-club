
-- Add bonus_coins column to users table
ALTER TABLE public.users ADD COLUMN bonus_coins integer NOT NULL DEFAULT 0;

-- Add bonus_day_active setting (default off)
INSERT INTO public.app_settings (key, value) VALUES ('bonus_day_active', 'false')
ON CONFLICT (key) DO NOTHING;
