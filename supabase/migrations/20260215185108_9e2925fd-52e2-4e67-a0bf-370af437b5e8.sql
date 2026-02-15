
-- Admin promo codes table (separate from user-generated ones)
CREATE TABLE public.admin_promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  coins_reward integer NOT NULL DEFAULT 10,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_telegram_id bigint NOT NULL
);

-- Track who used admin promo codes
CREATE TABLE public.admin_promo_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id uuid NOT NULL REFERENCES public.admin_promo_codes(id) ON DELETE CASCADE,
  user_telegram_id bigint NOT NULL,
  coins_earned integer NOT NULL DEFAULT 0,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_telegram_id)
);

-- Track user promo redemption history  
CREATE TABLE public.promo_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_telegram_id bigint NOT NULL,
  code text NOT NULL,
  coins_earned integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'user',
  redeemed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_history ENABLE ROW LEVEL SECURITY;
