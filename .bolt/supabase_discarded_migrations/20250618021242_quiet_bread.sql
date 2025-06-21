/*
  # Migrate from credit system to token system

  1. Schema Changes
    - Rename `credits_remaining` to `tokens_remaining`
    - Rename `daily_credits_used` to `daily_tokens_used`
    - Rename `monthly_credits_used` to `monthly_tokens_used`
    - Rename `last_credit_reset` to `last_token_reset`
    - Update default values for new token limits

  2. Token Limits
    - Free tier: 100,000 tokens per day, 1,000,000 per month
    - Pro tier: 5,000,000 tokens per month (no daily limit)
    - Premium tier: 10,000,000 tokens per month (no daily limit)

  3. Functions
    - Update reset functions to use token terminology
    - Update security logging functions

  4. Notes
    - This migration preserves existing data while updating the schema
    - Token amounts are scaled appropriately from credit amounts
*/

-- Rename columns to use token terminology
DO $$
BEGIN
  -- Rename credits_remaining to tokens_remaining
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE users RENAME COLUMN credits_remaining TO tokens_remaining;
  END IF;

  -- Rename daily_credits_used to daily_tokens_used
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'daily_credits_used'
  ) THEN
    ALTER TABLE users RENAME COLUMN daily_credits_used TO daily_tokens_used;
  END IF;

  -- Rename monthly_credits_used to monthly_tokens_used
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_credits_used'
  ) THEN
    ALTER TABLE users RENAME COLUMN monthly_credits_used TO monthly_tokens_used;
  END IF;

  -- Rename last_credit_reset to last_token_reset
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_credit_reset'
  ) THEN
    ALTER TABLE users RENAME COLUMN last_credit_reset TO last_token_reset;
  END IF;
END $$;

-- Update constraints to use token terminology
DO $$
BEGIN
  -- Drop old constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_credits_remaining_check') THEN
    ALTER TABLE users DROP CONSTRAINT users_credits_remaining_check;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_daily_credits_used_check') THEN
    ALTER TABLE users DROP CONSTRAINT users_daily_credits_used_check;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_monthly_credits_used_check') THEN
    ALTER TABLE users DROP CONSTRAINT users_monthly_credits_used_check;
  END IF;

  -- Add new constraints with token terminology
  ALTER TABLE users ADD CONSTRAINT users_tokens_remaining_check CHECK (tokens_remaining >= 0);
  ALTER TABLE users ADD CONSTRAINT users_daily_tokens_used_check CHECK (daily_tokens_used >= 0);
  ALTER TABLE users ADD CONSTRAINT users_monthly_tokens_used_check CHECK (monthly_tokens_used >= 0);
END $$;

-- Update existing users with new token amounts
UPDATE users 
SET 
  tokens_remaining = CASE 
    WHEN subscription_tier = 'free' THEN 100000  -- 100K daily limit for free
    WHEN subscription_tier = 'pro' THEN 5000000  -- 5M monthly for pro
    WHEN subscription_tier = 'premium' THEN 10000000  -- 10M monthly for premium
    ELSE 100000
  END,
  daily_tokens_used = 0,
  monthly_tokens_used = 0,
  last_token_reset = CURRENT_DATE;

-- Update the default value for new users
ALTER TABLE users ALTER COLUMN tokens_remaining SET DEFAULT 100000;

-- Create function to reset daily tokens
CREATE OR REPLACE FUNCTION reset_daily_tokens()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    tokens_remaining = CASE 
      WHEN subscription_tier = 'free' THEN LEAST(100000, 1000000 - monthly_tokens_used)
      ELSE tokens_remaining 
    END,
    daily_tokens_used = 0,
    last_token_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND last_token_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly tokens
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    monthly_tokens_used = 0,
    monthly_exports_used = 0,
    tokens_remaining = CASE 
      WHEN subscription_tier = 'free' THEN 100000
      WHEN subscription_tier = 'pro' THEN 5000000
      WHEN subscription_tier = 'premium' THEN 10000000
      ELSE tokens_remaining
    END,
    daily_tokens_used = CASE
      WHEN subscription_tier = 'free' THEN 0
      ELSE daily_tokens_used
    END
  WHERE 
    EXTRACT(DAY FROM CURRENT_DATE) = monthly_reset_date
    AND last_token_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update security logging function to use token terminology
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_action text,
  p_resource text,
  p_allowed boolean,
  p_subscription_tier text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    action,
    resource,
    allowed,
    subscription_tier,
    ip_address,
    user_agent,
    error_message
  ) VALUES (
    p_user_id,
    p_action,
    p_resource,
    p_allowed,
    p_subscription_tier,
    p_ip_address,
    p_user_agent,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old credit-related functions if they exist
DROP FUNCTION IF EXISTS reset_daily_credits();
DROP FUNCTION IF EXISTS reset_monthly_credits();