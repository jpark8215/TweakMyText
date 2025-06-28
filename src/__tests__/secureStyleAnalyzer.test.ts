import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeToneFromSamples, secureRewriteText } from '../utils/secureStyleAnalyzer';
import { WritingSample, User } from '../types';

// Mock dependencies
vi.mock('../utils/subscriptionValidator', () => ({
  validateToneAccess: vi.fn(),
  validateToneSettings: vi.fn(),
  getAnalysisLevel: vi.fn((user) => {
    if (!user) return 'basic';
    switch (user.subscription_tier) {
      case 'premium': return 'extended';
      case 'pro': return 'advanced';
      default: return 'basic';
    }
  }),
  getProcessingPriority: vi.fn((user) => {
    if (!user) return 3;
    switch (user.subscription_tier) {
      case 'premium': return 1;
      case 'pro': return 2;
      default: return 3;
    }
  }),
  getSubscriptionLimits: vi.fn((user) => {
    if (!user) return { availableToneControls: [], canModifyTone: false };
    switch (user.subscription_tier) {
      case 'premium':
        return { 
          availableToneControls: ['formality', 'casualness', 'enthusiasm', 'technicality', 'creativity', 'empathy', 'confidence', 'humor', 'urgency', 'clarity'],
          canModifyTone: true,
          hasExtendedAnalysis: true,
          hasAdvancedAnalysis: true,
          hasPriorityProcessing: true
        };
      case 'pro':
        return { 
          availableToneControls: ['formality', 'casualness', 'enthusiasm', 'technicality', 'creativity', 'empathy'],
          canModifyTone: true,
          hasExtendedAnalysis: false,
          hasAdvancedAnalysis: true,
          hasPriorityProcessing: true
        };
      default:
        return { 
          availableToneControls: [],
          canModifyTone: false,
          hasExtendedAnalysis: false,
          hasAdvancedAnalysis: false,
          hasPriorityProcessing: false
        };
    }
  })
}));

vi.mock('../utils/claudeApi', () => ({
  rewriteWithClaude: vi.fn()
}));

describe('Secure Style Analyzer', () => {
  // Sample test data
  const samples: WritingSample[] = [
    {
      id: '1',
      title: 'Formal Sample',
      content: 'However, it is important to note that furthermore, the implementation of this methodology requires careful consideration.',
      createdAt: new Date(),
      saved: true
    },
    {
      id: '2',
      title: 'Casual Sample',
      content: 'Yeah, I kinda think this is gonna be awesome! It\'s really cool stuff.',
      createdAt: new Date(),
      saved: true
    }
  ];

  const freeUser: User = {
    id: 'free-user',
    email: 'free@example.com',
    subscription_tier: 'free',
    tokens_remaining: 100000,
    daily_tokens_used: 0,
    monthly_tokens_used: 0,
    monthly_exports_used: 0,
    last_token_reset: '2025-01-01',
    monthly_reset_date: 1,
    created_at: new Date()
  };

  const proUser: User = {
    ...freeUser,
    id: 'pro-user',
    email: 'pro@example.com',
    subscription_tier: 'pro',
    tokens_remaining: 5000000
  };

  const premiumUser: User = {
    ...freeUser,
    id: 'premium-user',
    email: 'premium@example.com',
    subscription_tier: 'premium',
    tokens_remaining: 10000000
  };

  describe('analyzeToneFromSamples', () => {
    it('should return default settings for empty samples', () => {
      const result = analyzeToneFromSamples([], null);
      
      expect(result.formality).toBe(50);
      expect(result.casualness).toBe(50);
      expect(result.enthusiasm).toBe(50);
      expect(result.technicality).toBe(50);
      expect(result.creativity).toBe(50);
      expect(result.empathy).toBe(50);
      expect(result.confidence).toBe(50);
      expect(result.humor).toBe(50);
      expect(result.urgency).toBe(50);
      expect(result.clarity).toBe(50);
    });

    it('should detect formal tone from samples', () => {
      const result = analyzeToneFromSamples([samples[0]], null);
      
      expect(result.formality).toBeGreaterThan(50);
    });

    it('should detect casual tone from samples', () => {
      const result = analyzeToneFromSamples([samples[1]], null);
      
      expect(result.formality).toBeLessThan(50);
      expect(result.casualness).toBeGreaterThan(50);
    });

    it('should provide more detailed analysis for pro users', () => {
      const result = analyzeToneFromSamples(samples, proUser);
      
      // Pro users get 6 tone controls
      expect(result.formality).not.toBe(50);
      expect(result.casualness).not.toBe(50);
      expect(result.enthusiasm).not.toBe(50);
      expect(result.technicality).not.toBe(50);
      expect(result.creativity).not.toBe(50);
      expect(result.empathy).not.toBe(50);
    });

    it('should provide comprehensive analysis for premium users', () => {
      const result = analyzeToneFromSamples(samples, premiumUser);
      
      // Premium users get all 10 tone controls
      expect(result.formality).not.toBe(50);
      expect(result.casualness).not.toBe(50);
      expect(result.enthusiasm).not.toBe(50);
      expect(result.technicality).not.toBe(50);
      expect(result.creativity).not.toBe(50);
      expect(result.empathy).not.toBe(50);
      expect(result.confidence).not.toBe(50);
      expect(result.humor).not.toBe(50);
      expect(result.urgency).not.toBe(50);
      expect(result.clarity).not.toBe(50);
    });
  });

  describe('secureRewriteText', () => {
    const originalText = 'This is a test sentence that needs to be rewritten.';
    const toneSettings = {
      formality: 80, casualness: 20, enthusiasm: 60, technicality: 70,
      creativity: 50, empathy: 50, confidence: 90, humor: 30, urgency: 40, clarity: 60
    };

    beforeEach(() => {
      // Reset environment variables mock
      vi.stubEnv('VITE_CLAUDE_API_KEY', '');
    });

    it('should filter tone settings based on user tier', async () => {
      const result = await secureRewriteText(originalText, samples, toneSettings, proUser);
      
      // Result should exist
      expect(result).toBeDefined();
      expect(result.original).toBe(originalText);
      expect(result.rewritten).not.toBe(originalText);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.styleTags.length).toBeGreaterThan(0);
    });

    it('should apply different processing speeds based on tier', async () => {
      const startTime = Date.now();
      await secureRewriteText(originalText, samples, toneSettings, freeUser);
      const freeTime = Date.now() - startTime;
      
      const proStartTime = Date.now();
      await secureRewriteText(originalText, samples, toneSettings, proUser);
      const proTime = Date.now() - proStartTime;
      
      // Pro should be faster than free
      expect(proTime).toBeLessThan(freeTime);
    });

    it('should generate different style tags based on user tier', async () => {
      const freeResult = await secureRewriteText(originalText, samples, toneSettings, freeUser);
      const proResult = await secureRewriteText(originalText, samples, toneSettings, proUser);
      const premiumResult = await secureRewriteText(originalText, samples, toneSettings, premiumUser);
      
      // Premium should have more style tags than pro, which should have more than free
      expect(premiumResult.styleTags.length).toBeGreaterThanOrEqual(proResult.styleTags.length);
      expect(proResult.styleTags.length).toBeGreaterThanOrEqual(freeResult.styleTags.length);
    });

    it('should have higher confidence scores for premium users', async () => {
      const freeResult = await secureRewriteText(originalText, samples, toneSettings, freeUser);
      const proResult = await secureRewriteText(originalText, samples, toneSettings, proUser);
      const premiumResult = await secureRewriteText(originalText, samples, toneSettings, premiumUser);
      
      // Premium should have higher confidence than pro, which should be higher than free
      expect(premiumResult.confidence).toBeGreaterThan(proResult.confidence);
      expect(proResult.confidence).toBeGreaterThan(freeResult.confidence);
    });
  });
});