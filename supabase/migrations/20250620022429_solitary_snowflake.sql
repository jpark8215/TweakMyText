/*
  # Update rewrite history table schema

  1. Schema Updates
    - Ensure rewrite_history table has proper structure
    - Add missing columns if needed
    - Update constraints and indexes

  2. Security
    - Maintain RLS policies
    - Ensure proper user access controls

  3. Performance
    - Add indexes for common queries
    - Optimize for history retrieval
*/

-- Ensure rewrite_history table exists with correct schema
CREATE TABLE IF NOT EXISTS rewrite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  rewritten_text text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  style_tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rewrite_history ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies
DROP POLICY IF EXISTS "Users can insert own rewrite history" ON rewrite_history;
DROP POLICY IF EXISTS "Users can read own rewrite history" ON rewrite_history;

CREATE POLICY "Users can insert own rewrite history"
  ON rewrite_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own rewrite history"
  ON rewrite_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rewrite_history_user_id ON rewrite_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_history_created_at ON rewrite_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewrite_history_user_created ON rewrite_history(user_id, created_at DESC);

-- Function to get rewrite statistics
CREATE OR REPLACE FUNCTION get_rewrite_stats(p_user_id uuid)
RETURNS TABLE(
  total_rewrites bigint,
  this_month bigint,
  last_rewrite timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_rewrites,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month,
    MAX(created_at) as last_rewrite
  FROM rewrite_history 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_rewrite_stats(uuid) TO authenticated;