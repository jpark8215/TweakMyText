/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches Supabase auth.users id
      - `email` (text, unique, not null) - user's email address
      - `subscription_tier` (text, default 'free') - subscription level (free, pro, premium)
      - `credits_remaining` (integer, default 3) - number of rewrite credits available
      - `subscription_expires_at` (timestamptz, nullable) - when subscription expires
      - `created_at` (timestamptz, default now()) - when user record was created

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to update their own data
    - Add policy for users to insert their own profile on signup

  3. Notes
    - The `id` field should match the Supabase auth.users.id for proper user linking
    - Free tier users start with 3 credits
    - Subscription expiration is optional (null for free users)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  credits_remaining integer DEFAULT 3 CHECK (credits_remaining >= 0),
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);