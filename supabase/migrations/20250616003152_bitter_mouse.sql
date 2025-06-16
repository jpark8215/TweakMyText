/*
  # Update Pro tier credit limits

  1. Schema Changes
    - Update default credits for Pro tier users
    - Update reset functions for Pro tier specifications

  2. Pro Tier Specifications
    - 200 credits per month (no daily limit)
    - 200 exports per month
    - Advanced style analysis
    - Priority processing
    - Access to basic tone presets

  3. Notes
    - Pro users don't have daily limits, only monthly
    - Monthly credits reset on signup anniversary
*/

-- Update Pro users to have 200 monthly credits
UPDATE users 
SET 
  credits_remaining = CASE 
    WHEN subscription_tier = 'pro' THEN 200
    ELSE credits_remaining
  END,
  monthly_credits_used = 0,
  daily_credits_used = 0
WHERE subscription_tier = 'pro';

-- Update the daily reset function to handle Pro tier (no daily limits)
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

-- Update monthly reset function for Pro tier
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