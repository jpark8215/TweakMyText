/*
  # Update Premium tier specifications

  1. Schema Changes
    - Update Premium users to have 300 monthly credits
    - Ensure proper credit limits for Premium tier

  2. Credit Limits
    - Free tier: 3 credits per day, maximum 90 per month
    - Pro tier: 200 credits per month (no daily limit)
    - Premium tier: 300 credits per month (no daily limit)

  3. Notes
    - Premium users get unlimited exports
    - Premium users can save up to 100 writing samples
    - Premium users get fastest processing (3x speed)
*/

-- Update Premium users to have 300 monthly credits
UPDATE users 
SET 
  credits_remaining = CASE 
    WHEN subscription_tier = 'premium' THEN 300
    ELSE credits_remaining
  END,
  monthly_credits_used = 0,
  daily_credits_used = 0
WHERE subscription_tier = 'premium';

-- Update the daily reset function to handle Premium tier (no daily limits)
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  -- Only reset daily credits for free users
  UPDATE users 
  SET 
    credits_remaining = CASE 
      WHEN subscription_tier = 'free' THEN LEAST(3, 90 - monthly_credits_used)
      ELSE credits_remaining 
    END,
    daily_credits_used = CASE
      WHEN subscription_tier = 'free' THEN 0
      ELSE daily_credits_used
    END,
    last_credit_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update monthly reset function for Premium tier
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
    daily_credits_used = CASE
      WHEN subscription_tier = 'free' THEN 0
      ELSE daily_credits_used
    END
  WHERE 
    EXTRACT(DAY FROM CURRENT_DATE) = monthly_reset_date
    AND last_credit_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;