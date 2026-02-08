-- Allow reading withdrawal requests (app uses telegram_id filtering in queries)
CREATE POLICY "Withdrawal requests readable"
ON public.withdrawal_requests
FOR SELECT
USING (true);