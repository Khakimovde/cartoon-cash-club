
-- Users table (identified by Telegram ID)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  coins INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Referrals tracking
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_telegram_id BIGINT NOT NULL,
  referred_telegram_id BIGINT UNIQUE NOT NULL,
  bonus_coins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ad views tracking
CREATE TABLE public.ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  coins_earned INTEGER DEFAULT 0,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Channel tasks
CREATE TABLE public.channel_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  reward INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Channel subscriptions
CREATE TABLE public.channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  channel_task_id UUID REFERENCES public.channel_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_telegram_id, channel_task_id)
);

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id BIGINT NOT NULL,
  amount_coins INTEGER NOT NULL,
  amount_som INTEGER NOT NULL,
  card_number TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- App settings
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users (identified by telegram_id)
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies (for client-side leaderboard, channel list, settings)
CREATE POLICY "Users leaderboard readable" ON public.users FOR SELECT USING (true);
CREATE POLICY "Channel tasks readable" ON public.channel_tasks FOR SELECT USING (true);
CREATE POLICY "App settings readable" ON public.app_settings FOR SELECT USING (true);

-- No direct write policies - all writes go through edge functions with service_role key

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Default admin
INSERT INTO public.admin_users (telegram_id) VALUES (5326022510);

-- Default app settings
INSERT INTO public.app_settings (key, value) VALUES
  ('min_withdrawal_coins', '5000'),
  ('exchange_rate_coins', '5000'),
  ('exchange_rate_som', '10000'),
  ('ad_reward_coins', '13'),
  ('max_ads_per_session', '10'),
  ('cooldown_minutes', '30');

-- Default channel tasks
INSERT INTO public.channel_tasks (name, username, reward) VALUES
  ('Asosiy kanal', '@asosiy_kanal', 150),
  ('Yangiliklar', '@yangiliklar_uz', 100),
  ('Chegirmalar', '@chegirmalar', 120);
