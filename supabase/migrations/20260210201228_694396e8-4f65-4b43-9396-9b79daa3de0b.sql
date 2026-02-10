-- Add sort_order column to game_settings
ALTER TABLE public.game_settings ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Set default sort orders
UPDATE public.game_settings SET sort_order = 1 WHERE id = 'viselitsa';
UPDATE public.game_settings SET sort_order = 2 WHERE id = 'mines';
UPDATE public.game_settings SET sort_order = 3 WHERE id = 'sandiq';
UPDATE public.game_settings SET sort_order = 4 WHERE id = 'raqam_topish';
UPDATE public.game_settings SET sort_order = 5 WHERE id = 'tez_hisob';
UPDATE public.game_settings SET sort_order = 6 WHERE id = 'xotira';
