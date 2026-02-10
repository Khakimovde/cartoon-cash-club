
-- Game settings table for admin to control games
CREATE TABLE public.game_settings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🎮',
  bet_amount INTEGER NOT NULL DEFAULT 10,
  reward_amount INTEGER NOT NULL DEFAULT 20,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read active games
CREATE POLICY "Anyone can read game settings"
ON public.game_settings FOR SELECT USING (true);

-- Insert default games
INSERT INTO public.game_settings (id, name, description, emoji, bet_amount, reward_amount, active) VALUES
  ('viselitsa', 'Viselitsa', 'So''zni toping!', '🎯', 10, 20, true),
  ('mines', 'Mines', 'Minalardan qoching!', '💣', 10, 20, true),
  ('sandiq', 'Sandiq', '9 ta sandiqdan tanlang!', '🎁', 15, 30, true),
  ('raqam_topish', 'Raqam Topish', '1-100 raqamni toping!', '🔢', 10, 20, true),
  ('tez_hisob', 'Tez Hisob', 'Tez hisoblang!', '🧮', 10, 20, true),
  ('xotira', 'Xotira O''yini', 'Juftliklarni toping!', '🧠', 10, 20, true);

-- Create trigger for updated_at
CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON public.game_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
