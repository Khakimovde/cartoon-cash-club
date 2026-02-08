-- Add referral_earnings column to users table for tracking earnings from referrals
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_earnings integer NOT NULL DEFAULT 0;

-- Add referral_count column if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;

-- Create or update function to distribute referral earnings when a user earns coins
CREATE OR REPLACE FUNCTION public.distribute_referral_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id bigint;
  referrer_referral_count integer;
  bonus_percent integer;
  coins_earned integer;
  bonus_coins integer;
BEGIN
  -- Only process if coins increased (user earned coins)
  IF NEW.coins > OLD.coins THEN
    coins_earned := NEW.coins - OLD.coins;
    
    -- Find the referrer
    SELECT referred_by INTO referrer_id FROM users WHERE telegram_id = NEW.telegram_id;
    
    IF referrer_id IS NOT NULL THEN
      -- Get referrer's referral count
      SELECT referral_count INTO referrer_referral_count FROM users WHERE telegram_id = referrer_id;
      
      -- Calculate bonus percent based on referral count (levels)
      -- Level 1: 0+ referrals = 5%
      -- Level 2: 10+ referrals = 7%
      -- Level 3: 20+ referrals = 15%
      -- Level 4: 50+ referrals = 20%
      -- Level 5: 100+ referrals = 25%
      IF referrer_referral_count >= 100 THEN
        bonus_percent := 25;
      ELSIF referrer_referral_count >= 50 THEN
        bonus_percent := 20;
      ELSIF referrer_referral_count >= 20 THEN
        bonus_percent := 15;
      ELSIF referrer_referral_count >= 10 THEN
        bonus_percent := 7;
      ELSE
        bonus_percent := 5;
      END IF;
      
      -- Calculate bonus coins
      bonus_coins := GREATEST(1, (coins_earned * bonus_percent) / 100);
      
      -- Add bonus to referrer's coins and referral_earnings
      UPDATE users 
      SET coins = coins + bonus_coins,
          referral_earnings = referral_earnings + bonus_coins
      WHERE telegram_id = referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral earnings distribution
DROP TRIGGER IF EXISTS on_user_coins_change ON public.users;
CREATE TRIGGER on_user_coins_change
  AFTER UPDATE OF coins ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.distribute_referral_earnings();

-- Add cooldown_minutes setting if not exists
INSERT INTO public.app_settings (key, value) 
VALUES ('cooldown_minutes', '40')
ON CONFLICT (key) DO NOTHING;