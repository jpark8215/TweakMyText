/*
  # Add admin role management

  1. Schema Changes
    - Add `is_admin` column to users table
    - Add `admin_notes` column for admin management notes
    - Create admin audit logging

  2. Security
    - Only admins can modify admin status
    - Admin actions are logged separately
    - RLS policies prevent non-admin access

  3. Functions
    - `is_user_admin()` - Check if user has admin privileges
    - `grant_admin_access()` - Grant admin access (admin only)
    - `revoke_admin_access()` - Revoke admin access (admin only)
    - `log_admin_action()` - Log admin actions

  4. Notes
    - First admin must be set manually in database
    - All admin actions are audited
    - Admin status is separate from subscription tiers
*/

-- Add admin columns to users table
DO $$
BEGIN
  -- Add is_admin column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  -- Add admin_notes column for management
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE users ADD COLUMN admin_notes text;
  END IF;

  -- Add admin_granted_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'admin_granted_at'
  ) THEN
    ALTER TABLE users ADD COLUMN admin_granted_at timestamptz;
  END IF;

  -- Add admin_granted_by reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'admin_granted_by'
  ) THEN
    ALTER TABLE users ADD COLUMN admin_granted_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin audit log policies
CREATE POLICY "Admins can read admin audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "System can insert admin audit logs"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for admin audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_audit_log (
    admin_user_id,
    target_user_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_target_user_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant admin access (admin only)
CREATE OR REPLACE FUNCTION grant_admin_access(
  p_target_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can grant admin access';
  END IF;

  -- Update target user
  UPDATE users 
  SET 
    is_admin = true,
    admin_notes = p_notes,
    admin_granted_at = now(),
    admin_granted_by = current_user_id
  WHERE id = p_target_user_id;

  -- Log the action
  PERFORM log_admin_action(
    current_user_id,
    p_target_user_id,
    'grant_admin_access',
    jsonb_build_object('notes', p_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke admin access (admin only)
CREATE OR REPLACE FUNCTION revoke_admin_access(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can revoke admin access';
  END IF;

  -- Prevent self-revocation
  IF current_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot revoke your own admin access';
  END IF;

  -- Update target user
  UPDATE users 
  SET 
    is_admin = false,
    admin_notes = p_reason,
    admin_granted_at = NULL,
    admin_granted_by = NULL
  WHERE id = p_target_user_id;

  -- Log the action
  PERFORM log_admin_action(
    current_user_id,
    p_target_user_id,
    'revoke_admin_access',
    jsonb_build_object('reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced update_subscription_tier function with admin logging
CREATE OR REPLACE FUNCTION update_subscription_tier(
  p_user_id uuid,
  p_new_tier text,
  p_billing_start timestamptz DEFAULT CURRENT_TIMESTAMP
)
RETURNS void AS $$
DECLARE
  current_user_id uuid := auth.uid();
  old_tier text;
  is_admin_action boolean := false;
BEGIN
  -- Get current tier
  SELECT subscription_tier INTO old_tier FROM users WHERE id = p_user_id;

  -- Check if this is an admin action (admin changing someone else's tier)
  IF current_user_id != p_user_id AND is_user_admin(current_user_id) THEN
    is_admin_action := true;
  ELSIF current_user_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied: Cannot modify another user''s subscription';
  END IF;

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

  -- Log admin action if applicable
  IF is_admin_action THEN
    PERFORM log_admin_action(
      current_user_id,
      p_user_id,
      'update_subscription_tier',
      jsonb_build_object(
        'old_tier', old_tier,
        'new_tier', p_new_tier,
        'billing_start', p_billing_start
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_admin_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_admin_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(uuid, uuid, text, jsonb, text, text) TO authenticated;

-- Add constraint to prevent multiple super admins (optional)
-- You can remove this if you want multiple admins
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_single_super_admin ON users(is_admin) WHERE is_admin = true;

-- Instructions for setting the first admin:
-- UPDATE users SET is_admin = true, admin_granted_at = now() WHERE email = 'your-admin-email@example.com';