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
  creativity: number; // 0-100 (NEW)
  empathy: number; // 0-100 (NEW)
  confidence: number; // 0-100 (NEW)
  humor: number; // 0-100 (NEW)
  urgency: number; // 0-100 (NEW)
  clarity: number; // 0-100 (NEW)
}

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  tokens_remaining: number;
  daily_tokens_used: number;
  monthly_tokens_used: number;
  monthly_exports_used: number;
  last_token_reset: string;
  monthly_reset_date: number;
  subscription_expires_at?: Date;
  billing_start_date?: Date; // NEW: When paid subscription billing started
  created_at: Date;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  tokens: number;
  features: string[];
  popular?: boolean;
  limits?: {
    writingSamples: number;
    dailyTokens: number;
    monthlyTokens: number;
    monthlyExports: number;
    processingSpeed: number; // multiplier (1x, 2x, 3x)
    exportFormats: string[];
    historyAccess: boolean;
    bulkOperations: boolean;
    support: 'community' | 'email' | 'priority';
  };
}

export interface UsageStats {
  total_rewrites: number;
  tokens_used: number;
  last_rewrite: Date;
}

export interface SubscriptionLimits {
  maxWritingSamples: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  monthlyExportLimit: number;
  processingPriority: 'standard' | 'high' | 'premium';
  exportFormats: string[];
  historyRetention: number; // days
  bulkOperations: boolean;
  customTonePresets: boolean;
  advancedAnalytics: boolean;
}