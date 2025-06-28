import { describe, it, expect } from 'vitest';
import { 
  getSubscriptionLimits, 
  validateToneAccess, 
  validateToneSettings,
  getAnalysisLevel,
  getProcessingPriority
} from '../utils/subscriptionValidator';
import { User } from '../types';

describe('Subscription Validator', () => {
  // Mock users for different tiers
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

  describe('getSubscriptionLimits', () => {
    it('should return correct limits for free tier', () => {
      const limits = getSubscriptionLimits(freeUser);
      
      expect(limits.canModifyTone).toBe(false);
      expect(limits.maxWritingSamples).toBe(3);
      expect(limits.dailyLimit).toBe(100000);
      expect(limits.monthlyLimit).toBe(1000000);
      expect(limits.exportLimit).toBe(5);
      expect(limits.availableToneControls).toHaveLength(0);
    });

    it('should return correct limits for pro tier', () => {
      const limits = getSubscriptionLimits(proUser);
      
      expect(limits.canModifyTone).toBe(true);
      expect(limits.maxWritingSamples).toBe(25);
      expect(limits.dailyLimit).toBe(-1); // No daily limit
      expect(limits.monthlyLimit).toBe(5000000);
      expect(limits.exportLimit).toBe(200);
      expect(limits.availableToneControls).toHaveLength(6);
    });

    it('should return correct limits for premium tier', () => {
      const limits = getSubscriptionLimits(premiumUser);
      
      expect(limits.canModifyTone).toBe(true);
      expect(limits.maxWritingSamples).toBe(100);
      expect(limits.dailyLimit).toBe(-1); // No daily limit
      expect(limits.monthlyLimit).toBe(10000000);
      expect(limits.exportLimit).toBe(-1); // Unlimited
      expect(limits.availableToneControls).toHaveLength(10);
    });

    it('should handle null user gracefully', () => {
      const limits = getSubscriptionLimits(null);
      
      expect(limits.canModifyTone).toBe(false);
      expect(limits.maxWritingSamples).toBe(0);
      expect(limits.availableToneControls).toHaveLength(0);
    });
  });

  describe('validateToneAccess', () => {
    it('should throw error for free users trying to modify tone', () => {
      expect(() => validateToneAccess(freeUser, 'modify_tone')).toThrow();
    });

    it('should allow pro users to modify basic tone settings', () => {
      expect(() => validateToneAccess(proUser, 'modify_tone')).not.toThrow();
    });

    it('should throw error for pro users trying to use advanced presets', () => {
      expect(() => validateToneAccess(proUser, 'use_advanced_presets')).toThrow();
    });

    it('should allow premium users to use all tone features', () => {
      expect(() => validateToneAccess(premiumUser, 'use_advanced_presets')).not.toThrow();
      expect(() => validateToneAccess(premiumUser, 'extended_analysis')).not.toThrow();
    });
  });

  describe('validateToneSettings', () => {
    const defaultSettings = {
      formality: 50, casualness: 50, enthusiasm: 50, technicality: 50,
      creativity: 50, empathy: 50, confidence: 50, humor: 50, urgency: 50, clarity: 50
    };

    it('should allow default settings for all users', () => {
      expect(() => validateToneSettings(freeUser, defaultSettings)).not.toThrow();
      expect(() => validateToneSettings(proUser, defaultSettings)).not.toThrow();
      expect(() => validateToneSettings(premiumUser, defaultSettings)).not.toThrow();
    });

    it('should throw error for free users with custom settings', () => {
      const customSettings = { ...defaultSettings, formality: 80 };
      expect(() => validateToneSettings(freeUser, customSettings)).toThrow();
    });

    it('should allow pro users to modify available controls', () => {
      const proSettings = { ...defaultSettings, formality: 80, casualness: 20 };
      expect(() => validateToneSettings(proUser, proSettings)).not.toThrow();
    });

    it('should throw error for pro users modifying premium-only controls', () => {
      const invalidSettings = { ...defaultSettings, formality: 80, confidence: 90 };
      expect(() => validateToneSettings(proUser, invalidSettings)).toThrow();
    });

    it('should allow premium users to modify all controls', () => {
      const premiumSettings = { 
        formality: 80, casualness: 20, enthusiasm: 70, technicality: 60,
        creativity: 90, empathy: 85, confidence: 95, humor: 40, urgency: 75, clarity: 80
      };
      expect(() => validateToneSettings(premiumUser, premiumSettings)).not.toThrow();
    });
  });

  describe('getAnalysisLevel', () => {
    it('should return basic for free users', () => {
      expect(getAnalysisLevel(freeUser)).toBe('basic');
    });

    it('should return advanced for pro users', () => {
      expect(getAnalysisLevel(proUser)).toBe('advanced');
    });

    it('should return extended for premium users', () => {
      expect(getAnalysisLevel(premiumUser)).toBe('extended');
    });
  });

  describe('getProcessingPriority', () => {
    it('should return lowest priority for free users', () => {
      expect(getProcessingPriority(freeUser)).toBe(3);
    });

    it('should return medium priority for pro users', () => {
      expect(getProcessingPriority(proUser)).toBe(2);
    });

    it('should return highest priority for premium users', () => {
      expect(getProcessingPriority(premiumUser)).toBe(1);
    });
  });
});