/*
  # Fix Authentication Setup Issues

  1. Database Functions
    - Fix RLS policies for auth operations
    - Ensure proper user management functions
    - Fix password update permissions

  2. Security
    - Verify auth schema permissions
    - Fix any missing triggers or functions
    - Ensure proper user profile creation
*/

-- Ensure the auth schema has proper permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon;

-- Fix user profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    subscription_tier,
    tokens_remaining,
    daily_tokens_used,
    monthly_tokens_used,
    monthly_exports_used,
    last_token_reset,
    monthly_reset_date
  )
  VALUES (
    new.id,
    new.email,
    'free',
    100000,
    0,
    0,
    0,
    CURRENT_DATE,
    EXTRACT(DAY FROM CURRENT_DATE)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Fix RLS policies for users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Recreate RLS policies with proper permissions
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure users table has proper structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tokens_remaining'
  ) THEN
    ALTER TABLE users ADD COLUMN tokens_remaining integer DEFAULT 100000 CHECK (tokens_remaining >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'daily_tokens_used'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_tokens_used integer DEFAULT 0 CHECK (daily_tokens_used >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_tokens_used'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_tokens_used integer DEFAULT 0 CHECK (monthly_tokens_used >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_exports_used'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_exports_used integer DEFAULT 0 CHECK (monthly_exports_used >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_token_reset'
  ) THEN
    ALTER TABLE users ADD COLUMN last_token_reset date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_reset_date'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_reset_date integer DEFAULT EXTRACT(DAY FROM CURRENT_DATE);
  END IF;
END $$;

-- Create or replace token reset functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION reset_daily_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_tokens() TO authenticated;

-- Ensure security audit log has proper RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own audit logs" ON security_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON security_audit_log;

CREATE POLICY "Users can read own audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON security_audit_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Fix any orphaned user records
DO $$
BEGIN
  -- Update any users missing required fields
  UPDATE users 
  SET 
    tokens_remaining = COALESCE(tokens_remaining, 100000),
    daily_tokens_used = COALESCE(daily_tokens_used, 0),
    monthly_tokens_used = COALESCE(monthly_tokens_used, 0),
    monthly_exports_used = COALESCE(monthly_exports_used, 0),
    last_token_reset = COALESCE(last_token_reset, CURRENT_DATE),
    monthly_reset_date = COALESCE(monthly_reset_date, EXTRACT(DAY FROM CURRENT_DATE))
  WHERE 
    tokens_remaining IS NULL 
    OR daily_tokens_used IS NULL 
    OR monthly_tokens_used IS NULL 
    OR monthly_exports_used IS NULL 
    OR last_token_reset IS NULL 
    OR monthly_reset_date IS NULL;
END $$;