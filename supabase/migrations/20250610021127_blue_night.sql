/*
  # Create writing samples table

  1. New Tables
    - `writing_samples`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to users.id)
      - `title` (text, not null) - descriptive title for the writing sample
      - `content` (text, not null) - the actual writing sample content
      - `created_at` (timestamptz, default now()) - when sample was created

  2. Security
    - Enable RLS on `writing_samples` table
    - Add policy for authenticated users to read their own samples
    - Add policy for authenticated users to insert their own samples
    - Add policy for authenticated users to update their own samples
    - Add policy for authenticated users to delete their own samples

  3. Notes
    - Users can only access their own writing samples
    - Samples are used to analyze writing style for text rewriting
*/

CREATE TABLE IF NOT EXISTS writing_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE writing_samples ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own writing samples
CREATE POLICY "Users can read own writing samples"
  ON writing_samples
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own writing samples
CREATE POLICY "Users can insert own writing samples"
  ON writing_samples
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own writing samples
CREATE POLICY "Users can update own writing samples"
  ON writing_samples
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own writing samples
CREATE POLICY "Users can delete own writing samples"
  ON writing_samples
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_writing_samples_user_id ON writing_samples(user_id);