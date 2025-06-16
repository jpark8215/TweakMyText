/*
  # Add export tracking for free tier users

  1. Schema Changes
    - Add `monthly_exports_used` column to track monthly export usage

  2. Export Limits
    - Free tier: 5 exports per month
    - Pro/Premium tier: Unlimited exports

  3. Notes
    - Monthly exports reset on the same day each month when user signed up
*/

-- Add monthly_exports_used column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_exports_used'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_exports_used integer DEFAULT 0 CHECK (monthly_exports_used >= 0);
  END IF;
END $$;

-- Update existing users to have 0 exports used
UPDATE users 
SET monthly_exports_used = 0
WHERE monthly_exports_used IS NULL;

-- Update the monthly reset function to include exports
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    monthly_credits_used = 0,
    monthly_exports_used = 0,
    credits_remaining = CASE 
      WHEN subscription_tier = 'free' THEN 3
      WHEN subscription_tier = 'pro' THEN 200
      WHEN subscription_tier = 'premium' THEN 300
      ELSE credits_remaining
    END,
    daily_credits_used = 0
  WHERE 
    EXTRACT(DAY FROM CURRENT_DATE) = monthly_reset_date
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;