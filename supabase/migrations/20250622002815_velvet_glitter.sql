/*
  # Fix token reset and billing dates to use billing creation date

  1. Schema Changes
    - Add `billing_start_date` column to track when subscription billing started
    - Update token reset logic to use billing start date for Pro/Premium users
    - Fix subscription expiration calculation based on billing cycles

  2. Token Reset Logic
    - Free tier: Reset based on user creation date (daily/monthly)
    - Pro/Premium: Reset based on billing start date (monthly only)

  3. Billing Cycle Tracking
    - Track when paid subscription started
    - Calculate next billing date from billing start, not user creation
    - Handle subscription upgrades/downgrades properly

  4. Notes
    - Preserves existing free user behavior
    - Fixes Pro/Premium billing cycle calculations
    - Ensures proper token reset timing
*/

-- Add billing_start_date column to track when paid subscription began
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'billing_start_date'
  ) THEN
    ALTER TABLE users ADD COLUMN billing_start_date timestamptz;
  END IF;
END $$;

-- Update existing Pro/Premium users with billing start date from their first payment
UPDATE users 
SET billing_start_date = (
  SELECT MIN(created_at) 
  FROM billing_history 
  WHERE billing_history.user_id = users.id 
    AND billing_history.status = 'paid'
    AND billing_history.subscription_tier IN ('pro', 'premium')
)
WHERE subscription_tier IN ('pro', 'premium') 
  AND billing_start_date IS NULL;

-- For users without billing history, use their creation date as fallback
UPDATE users 
SET billing_start_date = created_at
WHERE subscription_tier IN ('pro', 'premium') 
  AND billing_start_date IS NULL;

-- Create function to get next billing date based on billing start date
CREATE OR REPLACE FUNCTION get_next_billing_date(p_user_id uuid)
RETURNS timestamptz AS $$
DECLARE
  user_record users%ROWTYPE;
  next_billing timestamptz;
  billing_start timestamptz;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  
  -- For free users, return null (no billing)
  IF user_record.subscription_tier = 'free' THEN
    RETURN NULL;
  END IF;
  
  -- Use billing start date or creation date as fallback
  billing_start := COALESCE(user_record.billing_start_date, user_record.created_at);
  
  -- Calculate next billing date (monthly from billing start)
  next_billing := billing_start;
  WHILE next_billing <= CURRENT_TIMESTAMP LOOP
    next_billing := next_billing + INTERVAL '1 month';
  END LOOP;
  
  RETURN next_billing;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if monthly reset is due for Pro/Premium users
CREATE OR REPLACE FUNCTION should_reset_monthly_tokens(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_record users%ROWTYPE;
  billing_start timestamptz;
  last_reset_date date;
  current_billing_period_start timestamptz;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  
  -- Free users use different logic (day of month)
  IF user_record.subscription_tier = 'free' THEN
    RETURN EXTRACT(DAY FROM CURRENT_DATE) = user_record.monthly_reset_date
           AND user_record.last_token_reset < CURRENT_DATE;
  END IF;
  
  -- For Pro/Premium, use billing start date
  billing_start := COALESCE(user_record.billing_start_date, user_record.created_at);
  last_reset_date := user_record.last_token_reset;
  
  -- Find the start of current billing period
  current_billing_period_start := billing_start;
  WHILE current_billing_period_start + INTERVAL '1 month' <= CURRENT_TIMESTAMP LOOP
    current_billing_period_start := current_billing_period_start + INTERVAL '1 month';
  END LOOP;
  
  -- Reset if we haven't reset since the current billing period started
  RETURN last_reset_date < current_billing_period_start::date;
END;
$$ LANGUAGE plpgsql;

-- Update monthly token reset function to use billing dates
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS void AS $$
BEGIN
  -- Reset tokens for users who are due for monthly reset
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
    END,
    last_token_reset = CURRENT_DATE
  WHERE should_reset_monthly_tokens(id);
END;
$$ LANGUAGE plpgsql;

-- Update daily token reset function (only affects free users)
CREATE OR REPLACE FUNCTION reset_daily_tokens()
RETURNS void AS $$
BEGIN
  -- Only reset daily tokens for free users
  UPDATE users 
  SET 
    tokens_remaining = LEAST(100000, 1000000 - COALESCE(monthly_tokens_used, 0)),
    daily_tokens_used = 0,
    last_token_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND COALESCE(last_token_reset, '1970-01-01'::date) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle subscription tier changes and update billing start date
CREATE OR REPLACE FUNCTION update_subscription_tier(
  p_user_id uuid,
  p_new_tier text,
  p_billing_start timestamptz DEFAULT CURRENT_TIMESTAMP
)
RETURNS void AS $$
BEGIN
  -- Update subscription tier and billing start date
  UPDATE users 
  SET 
    subscription_tier = p_new_tier,
    billing_start_date = CASE 
      WHEN p_new_tier IN ('pro', 'premium') THEN p_billing_start
      ELSE NULL
    END,
    tokens_remaining = CASE 
      WHEN p_new_tier = 'free' THEN 100000
      WHEN p_new_tier = 'pro' THEN 5000000
      WHEN p_new_tier = 'premium' THEN 10000000
      ELSE tokens_remaining
    END,
    monthly_tokens_used = 0,
    daily_tokens_used = 0,
    monthly_exports_used = 0,
    last_token_reset = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_billing_date(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION should_reset_monthly_tokens(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_tier(uuid, text, timestamptz) TO authenticated;