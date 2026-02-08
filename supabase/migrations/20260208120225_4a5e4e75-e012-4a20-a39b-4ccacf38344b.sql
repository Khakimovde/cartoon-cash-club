-- Remove the duplicate trigger that causes double referral bonus calculation
DROP TRIGGER IF EXISTS on_user_coins_change ON public.users;