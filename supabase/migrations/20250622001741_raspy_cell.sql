/*
  # Add dummy billing data for testing cancellation flow

  1. Dummy Data
    - Add sample billing records for different subscription tiers
    - Include various payment statuses
    - Add records that demonstrate cancellation scenarios

  2. Test Data
    - Pro subscription with successful payments
    - Premium subscription with cancellation
    - Failed payment scenarios

  3. Notes
    - This data is for testing the billing history display
    - Demonstrates different subscription states
    - Shows cancellation and reactivation flows
*/

-- Insert dummy billing data for testing
-- Note: Replace the user_id values with actual user IDs from your users table

-- Function to create test billing data
CREATE OR REPLACE FUNCTION create_test_billing_data()
RETURNS void AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a test user ID (you can replace this with a specific user ID)
  SELECT id INTO test_user_id FROM users WHERE subscription_tier != 'free' LIMIT 1;
  
  -- If no paid user exists, create dummy data for any user
  IF test_user_id IS NULL THEN
    SELECT id INTO test_user_id FROM users LIMIT 1;
  END IF;
  
  -- Only proceed if we have a user
  IF test_user_id IS NOT NULL THEN
    -- Insert sample billing records
    INSERT INTO billing_history (
      user_id,
      amount,
      currency,
      status,
      description,
      subscription_tier,
      stripe_payment_id,
      created_at
    ) VALUES
    -- Recent Pro subscription payment
    (
      test_user_id,
      10.00,
      'USD',
      'paid',
      'Pro Monthly Subscription',
      'pro',
      'pi_test_1234567890',
      NOW() - INTERVAL '5 days'
    ),
    -- Previous month Pro payment
    (
      test_user_id,
      10.00,
      'USD',
      'paid',
      'Pro Monthly Subscription',
      'pro',
      'pi_test_0987654321',
      NOW() - INTERVAL '35 days'
    ),
    -- Premium upgrade
    (
      test_user_id,
      18.00,
      'USD',
      'paid',
      'Premium Monthly Subscription',
      'premium',
      'pi_test_1122334455',
      NOW() - INTERVAL '65 days'
    ),
    -- Failed payment (demonstrates cancellation scenario)
    (
      test_user_id,
      18.00,
      'USD',
      'failed',
      'Premium Monthly Subscription - Payment Failed',
      'premium',
      'pi_test_failed_001',
      NOW() - INTERVAL '95 days'
    ),
    -- Refund example
    (
      test_user_id,
      18.00,
      'USD',
      'refunded',
      'Premium Monthly Subscription - Refunded',
      'premium',
      'pi_test_refund_001',
      NOW() - INTERVAL '125 days'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create test data
SELECT create_test_billing_data();

-- Drop the function after use
DROP FUNCTION create_test_billing_data();

-- Add some additional test data for different scenarios
DO $$
DECLARE
  premium_user_id uuid;
  pro_user_id uuid;
BEGIN
  -- Find users with different subscription tiers
  SELECT id INTO premium_user_id FROM users WHERE subscription_tier = 'premium' LIMIT 1;
  SELECT id INTO pro_user_id FROM users WHERE subscription_tier = 'pro' LIMIT 1;
  
  -- Add billing data for premium user if exists
  IF premium_user_id IS NOT NULL THEN
    INSERT INTO billing_history (
      user_id,
      amount,
      currency,
      status,
      description,
      subscription_tier,
      created_at
    ) VALUES
    (
      premium_user_id,
      18.00,
      'USD',
      'paid',
      'Premium Monthly Subscription - Current',
      'premium',
      NOW() - INTERVAL '2 days'
    ),
    (
      premium_user_id,
      18.00,
      'USD',
      'paid',
      'Premium Monthly Subscription - Previous',
      'premium',
      NOW() - INTERVAL '32 days'
    );
  END IF;
  
  -- Add billing data for pro user if exists
  IF pro_user_id IS NOT NULL THEN
    INSERT INTO billing_history (
      user_id,
      amount,
      currency,
      status,
      description,
      subscription_tier,
      created_at
    ) VALUES
    (
      pro_user_id,
      10.00,
      'USD',
      'paid',
      'Pro Monthly Subscription - Current',
      'pro',
      NOW() - INTERVAL '1 day'
    ),
    (
      pro_user_id,
      10.00,
      'USD',
      'pending',
      'Pro Monthly Subscription - Processing',
      'pro',
      NOW() - INTERVAL '31 days'
    );
  END IF;
END $$;