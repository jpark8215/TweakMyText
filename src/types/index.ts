export interface WritingSample {
  id: string;
  content: string;
  title: string;
  createdAt: Date;
  saved?: boolean; // Whether the sample is saved to database
}

export interface WritingProfile {
  id: string;
  name: string;
  samples: WritingSample[];
  styleTags: string[];
  createdAt: Date;
  lastUsed: Date;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  confidence: number;
  styleTags: string[];
  timestamp: Date;
}

export interface ToneSettings {
  formality: number; // 0-100
  casualness: number; // 0-100
  enthusiasm: number; // 0-100
  technicality: number; // 0-100
}

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  credits_remaining: number;
  daily_credits_used: number;
  monthly_credits_used: number;
  last_credit_reset: string;
  monthly_reset_date: number;
  subscription_expires_at?: Date;
  created_at: Date;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

export interface UsageStats {
  total_rewrites: number;
  credits_used: number;
  last_rewrite: Date;
}