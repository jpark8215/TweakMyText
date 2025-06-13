/*
  # Update credit system for new pricing structure

  1. Schema Changes
    - Update default credits_remaining to 3 for new users
    - Update credit limits for new pricing tiers

  2. Credit Limits
    - Free tier: 3 credits per day, maximum 90 per month
    - Pro tier: 200 credits per month (no daily limit)
    - Premium tier: 300 credits per month (no daily limit)

  3. Notes
    - Daily credits reset at midnight UTC
    - Monthly credits reset on the same day each month when user signed up
    - Existing users will have their credits reset to 3
*/

-- Update the default value for new users
ALTER TABLE users ALTER COLUMN credits_remaining SET DEFAULT 3;

-- Update existing free users to have 3 daily credits and reset counters
UPDATE users 
SET 
  credits_remaining = 3,
  daily_credits_used = 0,
  monthly_credits_used = 0,
  last_credit_reset = CURRENT_DATE,
  monthly_reset_date = EXTRACT(DAY FROM CURRENT_DATE)
WHERE subscription_tier = 'free';

-- Update the reset functions for new pricing
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    credits_remaining = CASE 
      WHEN subscription_tier = 'free' THEN LEAST(3, 90 - monthly_credits_used)
      ELSE credits_remaining 
    END,
    daily_credits_used = 0,
    last_credit_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update monthly reset function for new pricing
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    monthly_credits_used = 0,
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