/*
  # Add billing history table for subscription management

  1. New Tables
    - `billing_history`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to users.id)
      - `amount` (numeric, not null) - billing amount
      - `currency` (text, default 'USD') - currency code
      - `status` (text, not null) - payment status (paid, pending, failed)
      - `description` (text, not null) - billing description
      - `subscription_tier` (text, not null) - tier at time of billing
      - `stripe_payment_id` (text, nullable) - Stripe payment ID for reference
      - `created_at` (timestamptz, default now()) - when billing record was created

  2. Security
    - Enable RLS on `billing_history` table
    - Add policy for users to read their own billing history
    - Add policy for system to insert billing records

  3. Notes
    - This table tracks all billing transactions
    - Useful for displaying billing history to users
    - Can be integrated with Stripe webhooks for real-time updates
*/

CREATE TABLE IF NOT EXISTS billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'USD' NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  description text NOT NULL,
  subscription_tier text NOT NULL CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own billing history
CREATE POLICY "Users can read own billing history"
  ON billing_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for system to insert billing records
CREATE POLICY "System can insert billing records"
  ON billing_history
  FOR INSERT
  WITH CHECK (true);

-- Index for faster queries by user_id and created_at
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);

-- Function to create billing record
CREATE OR REPLACE FUNCTION create_billing_record(
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_status text,
  p_description text,
  p_subscription_tier text,
  p_stripe_payment_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  billing_id uuid;
BEGIN
  INSERT INTO billing_history (
    user_id,
    amount,
    currency,
    status,
    description,
    subscription_tier,
    stripe_payment_id
  ) VALUES (
    p_user_id,
    p_amount,
    p_currency,
    p_status,
    p_description,
    p_subscription_tier,
    p_stripe_payment_id
  ) RETURNING id INTO billing_id;

  RETURN billing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;