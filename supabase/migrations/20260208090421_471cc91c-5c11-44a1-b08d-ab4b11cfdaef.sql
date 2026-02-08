
-- Update the distribute_referral_earnings function with new level thresholds
CREATE OR REPLACE FUNCTION public.distribute_referral_earnings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      
      -- Calculate bonus percent based on referrer's referral count (levels)
      -- Level 1: 0+ referrals = 5%
      -- Level 2: 15+ referrals = 7%
      -- Level 3: 30+ referrals = 15%
      -- Level 4: 60+ referrals = 20%
      -- Level 5: 100+ referrals = 25%
      IF referrer_referral_count >= 100 THEN
        bonus_percent := 25;
      ELSIF referrer_referral_count >= 60 THEN
        bonus_percent := 20;
      ELSIF referrer_referral_count >= 30 THEN
        bonus_percent := 15;
      ELSIF referrer_referral_count >= 15 THEN
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
$function$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_user_coins_change ON public.users;
CREATE TRIGGER on_user_coins_change
  AFTER UPDATE OF coins ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.distribute_referral_earnings();
