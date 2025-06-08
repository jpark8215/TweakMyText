import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          subscription_tier: 'free' | 'pro' | 'premium';
          credits_remaining: number;
          subscription_expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          subscription_tier?: 'free' | 'pro' | 'premium';
          credits_remaining?: number;
          subscription_expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          subscription_tier?: 'free' | 'pro' | 'premium';
          credits_remaining?: number;
          subscription_expires_at?: string | null;
          created_at?: string;
        };
      };
      writing_samples: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
        };
      };
      rewrite_history: {
        Row: {
          id: string;
          user_id: string;
          original_text: string;
          rewritten_text: string;
          confidence: number;
          style_tags: string[];
          credits_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_text: string;
          rewritten_text: string;
          confidence: number;
          style_tags: string[];
          credits_used: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_text?: string;
          rewritten_text?: string;
          confidence?: number;
          style_tags?: string[];
          credits_used?: number;
          created_at?: string;
        };
      };
    };
  };
};