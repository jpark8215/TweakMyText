import { User } from '../types';

export interface SubscriptionLimits {
  canModifyTone: boolean;
  canUsePresets: boolean;
  canUseAdvancedPresets: boolean;
  hasAdvancedAnalysis: boolean;
  hasExtendedAnalysis: boolean;
  hasPriorityProcessing: boolean;
  processingPriority: 'standard' | 'priority' | 'premium';
  maxWritingSamples: number;
  dailyLimit: number;
  monthlyLimit: number;
  exportLimit: number;
  availableToneControls: string[]; // NEW: Which tone controls are available
  maxToneControls: number; // NEW: Maximum number of tone controls
}

export const getSubscriptionLimits = (user: User | null): SubscriptionLimits => {
  if (!user) {
    return {
      canModifyTone: false,
      canUsePresets: false,
      canUseAdvancedPresets: false,
      hasAdvancedAnalysis: false,
      hasExtendedAnalysis: false,
      hasPriorityProcessing: false,
      processingPriority: 'standard',
      maxWritingSamples: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      exportLimit: 0,
      availableToneControls: [],
      maxToneControls: 0,
    };
  }

  switch (user.subscription_tier) {
    case 'premium':
      return {
        canModifyTone: true,
        canUsePresets: true,
        canUseAdvancedPresets: true,
        hasAdvancedAnalysis: true,
        hasExtendedAnalysis: true,
        hasPriorityProcessing: true,
        processingPriority: 'premium',
        maxWritingSamples: 100,
        dailyLimit: -1, // Unlimited
        monthlyLimit: 10000000, // 10M tokens
        exportLimit: -1, // Unlimited
        availableToneControls: [
          'formality', 'casualness', 'enthusiasm', 'technicality', 
          'creativity', 'empathy', 'confidence', 'humor', 'urgency', 'clarity'
        ],
        maxToneControls: 10,
      };
    case 'pro':
      return {
        canModifyTone: true,
        canUsePresets: true,
        canUseAdvancedPresets: false,
        hasAdvancedAnalysis: true,
        hasExtendedAnalysis: false,
        hasPriorityProcessing: true,
        processingPriority: 'priority',
        maxWritingSamples: 25,
        dailyLimit: -1, // Unlimited
        monthlyLimit: 5000000, // 5M tokens
        exportLimit: 200,
        availableToneControls: [
          'formality', 'casualness', 'enthusiasm', 'technicality', 'creativity', 'empathy'
        ],
        maxToneControls: 6,
      };
    default: // free
      return {
        canModifyTone: false,
        canUsePresets: false,
        canUseAdvancedPresets: false,
        hasAdvancedAnalysis: false,
        hasExtendedAnalysis: false,
        hasPriorityProcessing: false,
        processingPriority: 'standard',
        maxWritingSamples: 3,
        dailyLimit: 100000, // 100K daily limit
        monthlyLimit: 1000000, // 1M monthly limit (CORRECTED)
        exportLimit: 5,
        availableToneControls: [], // View-only, no modification
        maxToneControls: 0,
      };
  }
};

export const validateToneAccess = (user: User | null, action: string): void => {
  const limits = getSubscriptionLimits(user);

  switch (action) {
    case 'modify_tone':
      if (!limits.canModifyTone) {
        throw new Error('Tone customization requires Pro or Premium subscription. Free users have view-only access to auto-detected tone settings.');
      }
      break;
    case 'use_presets':
      if (!limits.canUsePresets) {
        throw new Error('Tone presets require Pro or Premium subscription');
      }
      break;
    case 'use_advanced_presets':
      if (!limits.canUseAdvancedPresets) {
        throw new Error('Advanced tone presets require Premium subscription');
      }
      break;
    case 'advanced_analysis':
      if (!limits.hasAdvancedAnalysis) {
        throw new Error('Advanced style analysis requires Pro or Premium subscription');
      }
      break;
    case 'extended_analysis':
      if (!limits.hasExtendedAnalysis) {
        throw new Error('Extended style analysis requires Premium subscription');
      }
      break;
    case 'priority_processing':
      if (!limits.hasPriorityProcessing) {
        throw new Error('Priority processing requires Pro or Premium subscription');
      }
      break;
    default:
      throw new Error('Unknown action for subscription validation');
  }
};

export const validateToneSettings = (user: User | null, toneSettings: any): void => {
  const limits = getSubscriptionLimits(user);

  // Free users cannot modify any tone settings
  if (!limits.canModifyTone) {
    // Check if user is trying to use custom tone settings
    const defaultSettings = { 
      formality: 50, casualness: 50, enthusiasm: 50, technicality: 50,
      creativity: 50, empathy: 50, confidence: 50, humor: 50, urgency: 50, clarity: 50
    };
    
    // For free users, we need to be more lenient with auto-detected settings
    // Only throw error if they're trying to manually modify settings significantly
    const hasSignificantCustomSettings = Object.keys(toneSettings).some(
      key => {
        const currentValue = toneSettings[key];
        const defaultValue = defaultSettings[key] || 50;
        // Allow larger tolerance for auto-detected settings (15 points)
        return Math.abs(currentValue - defaultValue) > 15;
      }
    );

    if (hasSignificantCustomSettings) {
      throw new Error('Custom tone settings require Pro or Premium subscription. Free users have view-only access.');
    }
    return;
  }

  // For Pro/Premium users, only validate if they're trying to use unavailable controls
  // But only check controls that have been significantly modified from default (50)
  const unavailableControlsInUse = Object.keys(toneSettings).filter(control => {
    // Only check if this control is not available for their tier
    if (limits.availableToneControls.includes(control)) {
      return false; // Control is available, no issue
    }
    
    // Check if the control has been significantly modified from default
    const value = toneSettings[control];
    const defaultValue = 50;
    const isSignificantlyModified = Math.abs(value - defaultValue) > 10; // Allow 10% tolerance
    
    return isSignificantlyModified;
  });

  if (unavailableControlsInUse.length > 0) {
    const tierName = user?.subscription_tier === 'pro' ? 'Premium' : 'Pro or Premium';
    throw new Error(`The following tone controls require ${tierName} subscription: ${unavailableControlsInUse.join(', ')}`);
  }
};

export const validatePresetAccess = (user: User | null, presetName: string): void => {
  const limits = getSubscriptionLimits(user);
  
  const basicPresets = ['Professional', 'Friendly', 'Academic', 'Casual'];
  const advancedPresets = ['Executive', 'Creative', 'Technical', 'Persuasive'];

  if (basicPresets.includes(presetName) && !limits.canUsePresets) {
    throw new Error('Tone presets require Pro or Premium subscription');
  }

  if (advancedPresets.includes(presetName) && !limits.canUseAdvancedPresets) {
    throw new Error('Advanced tone presets require Premium subscription');
  }
};

export const getAnalysisLevel = (user: User | null): 'basic' | 'advanced' | 'extended' => {
  const limits = getSubscriptionLimits(user);
  
  if (limits.hasExtendedAnalysis) return 'extended';
  if (limits.hasAdvancedAnalysis) return 'advanced';
  return 'basic';
};

export const getProcessingPriority = (user: User | null): number => {
  const limits = getSubscriptionLimits(user);
  
  switch (limits.processingPriority) {
    case 'premium': return 1; // Highest priority
    case 'priority': return 2; // Medium priority
    default: return 3; // Standard priority
  }
};