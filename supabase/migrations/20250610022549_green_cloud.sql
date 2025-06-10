/*
  # Update credit system for daily limits

  1. Schema Changes
    - Add `daily_credits_used` column to track daily usage
    - Add `monthly_credits_used` column to track monthly usage  
    - Add `last_credit_reset` column to track when daily credits were last reset
    - Add `monthly_reset_date` column to track monthly reset
    - Update default credits_remaining to 2 for new users

  2. Credit Limits
    - Free tier: 2 credits per day, maximum 30 per month
    - Pro tier: 100 credits per month (no daily limit)
    - Premium tier: 500 credits per month (no daily limit)

  3. Notes
    - Daily credits reset at midnight UTC
    - Monthly credits reset on the same day each month when user signed up
    - Existing users will have their credits reset to 2
*/

-- Add new columns for credit tracking
DO $$
BEGIN
  -- Add daily_credits_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'daily_credits_used'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_credits_used integer DEFAULT 0 CHECK (daily_credits_used >= 0);
  END IF;

  -- Add monthly_credits_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_credits_used'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_credits_used integer DEFAULT 0 CHECK (monthly_credits_used >= 0);
  END IF;

  -- Add last_credit_reset column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_credit_reset'
  ) THEN
    ALTER TABLE users ADD COLUMN last_credit_reset date DEFAULT CURRENT_DATE;
  END IF;

  -- Add monthly_reset_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_reset_date'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_reset_date integer DEFAULT EXTRACT(DAY FROM CURRENT_DATE);
  END IF;
END $$;

-- Update existing users to have 2 daily credits and reset counters
UPDATE users 
SET 
  credits_remaining = 2,
  daily_credits_used = 0,
  monthly_credits_used = 0,
  last_credit_reset = CURRENT_DATE,
  monthly_reset_date = EXTRACT(DAY FROM CURRENT_DATE)
WHERE subscription_tier = 'free';

-- Update the default value for new users
ALTER TABLE users ALTER COLUMN credits_remaining SET DEFAULT 2;

-- Create function to reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    credits_remaining = CASE 
      WHEN subscription_tier = 'free' THEN LEAST(2, 30 - monthly_credits_used)
      ELSE credits_remaining 
    END,
    daily_credits_used = 0,
    last_credit_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    monthly_credits_used = 0,
    credits_remaining = CASE 
      WHEN subscription_tier = 'free' THEN 2
      WHEN subscription_tier = 'pro' THEN 100
      WHEN subscription_tier = 'premium' THEN 500
      ELSE credits_remaining
    END,
    daily_credits_used = 0
  WHERE 
    EXTRACT(DAY FROM CURRENT_DATE) = monthly_reset_date
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;