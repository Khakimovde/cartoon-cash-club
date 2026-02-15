
-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  coins_reward integer NOT NULL DEFAULT 10,
  created_by_telegram_id bigint NOT NULL,
  used_by_telegram_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Promo ad views table (separate from main ad_views, 30 min window)
CREATE TABLE public.promo_ad_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_telegram_id bigint NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_ad_views ENABLE ROW LEVEL SECURITY;
