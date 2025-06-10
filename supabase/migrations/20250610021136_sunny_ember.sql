/*
  # Create rewrite history table

  1. New Tables
    - `rewrite_history`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to users.id)
      - `original_text` (text, not null) - the original text that was rewritten
      - `rewritten_text` (text, not null) - the AI-generated rewritten text
      - `confidence` (numeric, not null) - confidence score of the rewrite (0-100)
      - `style_tags` (text array, not null) - tags describing the detected writing style
      - `credits_used` (integer, default 1) - number of credits consumed for this rewrite
      - `created_at` (timestamptz, default now()) - when rewrite was performed

  2. Security
    - Enable RLS on `rewrite_history` table
    - Add policy for authenticated users to read their own rewrite history
    - Add policy for authenticated users to insert their own rewrite history

  3. Notes
    - Users can only access their own rewrite history
    - History is used for tracking usage and providing user insights
    - Style tags help users understand what writing patterns were detected
*/

CREATE TABLE IF NOT EXISTS rewrite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  rewritten_text text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  style_tags text[] NOT NULL DEFAULT '{}',
  credits_used integer DEFAULT 1 CHECK (credits_used > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewrite_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own rewrite history
CREATE POLICY "Users can read own rewrite history"
  ON rewrite_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own rewrite history
CREATE POLICY "Users can insert own rewrite history"
  ON rewrite_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_rewrite_history_user_id ON rewrite_history(user_id);

-- Index for faster queries by created_at (for chronological ordering)
CREATE INDEX IF NOT EXISTS idx_rewrite_history_created_at ON rewrite_history(created_at DESC);