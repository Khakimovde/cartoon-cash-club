
-- Add rejection_reason column to withdrawal_requests
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
