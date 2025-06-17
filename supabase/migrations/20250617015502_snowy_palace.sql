/*
  # Add security audit logging for tone control access

  1. New Tables
    - `security_audit_log`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to users.id)
      - `action` (text, not null) - the action attempted
      - `resource` (text, not null) - the resource accessed
      - `allowed` (boolean, not null) - whether access was granted
      - `subscription_tier` (text, not null) - user's subscription tier at time of action
      - `ip_address` (text, nullable) - user's IP address
      - `user_agent` (text, nullable) - user's browser/client info
      - `error_message` (text, nullable) - error message if access denied
      - `created_at` (timestamptz, default now()) - when action was attempted

  2. Security
    - Enable RLS on `security_audit_log` table
    - Add policy for system to insert audit logs
    - Add policy for admins to read audit logs (future use)

  3. Functions
    - `log_security_event()` - function to log security events
    - `validate_subscription_access()` - function to validate subscription-based access

  4. Notes
    - This table helps track subscription bypass attempts
    - Useful for monitoring and security analysis
    - Can be used to identify patterns of abuse
*/

CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  allowed boolean NOT NULL,
  subscription_tier text NOT NULL,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for system to insert audit logs (no user restriction)
CREATE POLICY "System can insert audit logs"
  ON security_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Policy for future admin access (currently no one can read)
CREATE POLICY "Admins can read audit logs"
  ON security_audit_log
  FOR SELECT
  TO authenticated
  USING (false); -- Will be updated when admin roles are implemented

-- Index for faster queries by user_id and created_at
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_allowed ON security_audit_log(allowed);

-- Function to log security events
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

-- Function to validate subscription access and log attempts
CREATE OR REPLACE FUNCTION validate_subscription_access(
  p_user_id uuid,
  p_action text,
  p_required_tier text
)
RETURNS boolean AS $$
DECLARE
  user_tier text;
  access_granted boolean := false;
BEGIN
  -- Get user's current subscription tier
  SELECT subscription_tier INTO user_tier
  FROM users
  WHERE id = p_user_id;

  -- Check access based on required tier
  CASE p_required_tier
    WHEN 'pro' THEN
      access_granted := user_tier IN ('pro', 'premium');
    WHEN 'premium' THEN
      access_granted := user_tier = 'premium';
    ELSE
      access_granted := true; -- Free tier access
  END CASE;

  -- Log the access attempt
  PERFORM log_security_event(
    p_user_id,
    p_action,
    'tone_controls',
    access_granted,
    COALESCE(user_tier, 'unknown'),
    NULL, -- IP address would be passed from application
    NULL, -- User agent would be passed from application
    CASE WHEN NOT access_granted THEN 
      format('Access denied: %s requires %s subscription, user has %s', 
             p_action, p_required_tier, COALESCE(user_tier, 'no subscription'))
    ELSE NULL END
  );

  RETURN access_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and log tone control access
CREATE OR REPLACE FUNCTION check_tone_control_access(
  p_user_id uuid,
  p_action text
)
RETURNS boolean AS $$
DECLARE
  required_tier text;
  access_granted boolean;
BEGIN
  -- Determine required tier based on action
  CASE p_action
    WHEN 'modify_tone', 'use_presets' THEN
      required_tier := 'pro';
    WHEN 'use_advanced_presets', 'extended_analysis' THEN
      required_tier := 'premium';
    ELSE
      required_tier := 'free';
  END CASE;

  -- Validate access and log attempt
  SELECT validate_subscription_access(p_user_id, p_action, required_tier)
  INTO access_granted;

  RETURN access_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;