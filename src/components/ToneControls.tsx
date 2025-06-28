import React, { memo, useCallback, useMemo } from 'react';
import { X, BarChart3, Crown, Sparkles, Star, Settings, Lock, Zap } from 'lucide-react';
import { ToneSettings } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getSubscriptionLimits } from '../utils/subscriptionValidator';

interface ToneControlsProps {
  settings: ToneSettings;
  onChange: (settings: ToneSettings) => void;
  onClose: () => void;
  onOpenPricing?: () => void;
}

const ToneControls = memo(({ settings, onChange, onClose, onOpenPricing }: ToneControlsProps) => {
  const { user } = useAuth();
  const limits = useMemo(() => getSubscriptionLimits(user), [user?.subscription_tier]);

  const handleSliderChange = useCallback((key: keyof ToneSettings, value: number) => {
    // Check if user has permission to modify tone settings
    if (!limits.canModifyTone) {
      return; // Free users cannot modify tone settings
    }
    
    // Check if this specific control is available for the user's tier
    if (!limits.availableToneControls.includes(key)) {
      return; // Control not available for this tier
    }
    
    onChange({
      ...settings,
      [key]: value
    });
  }, [settings, onChange, limits]);

  const resetToDefaults = useCallback(() => {
    if (!limits.canModifyTone) {
      return; // Free users cannot reset tone settings
    }
    
    const defaultSettings: ToneSettings = { 
      formality: 50, 
      casualness: 50, 
      enthusiasm: 50, 
      technicality: 50,
      creativity: 50,
      empathy: 50,
      confidence: 50,
      humor: 50,
      urgency: 50,
      clarity: 50
    };
    
    // Only reset controls available to the user's tier
    const resetSettings = { ...settings };
    limits.availableToneControls.forEach(control => {
      resetSettings[control as keyof ToneSettings] = defaultSettings[control as keyof ToneSettings];
    });
    
    onChange(resetSettings);
  }, [settings, onChange, limits]);

  const handleUpgradeClick = useCallback(() => {
    onOpenPricing?.();
  }, [onOpenPricing]);

  const presets = useMemo(() => [
    { name: 'Professional', values: { formality: 80, casualness: 20, enthusiasm: 40, technicality: 70, creativity: 30, empathy: 50 } },
    { name: 'Friendly', values: { formality: 30, casualness: 80, enthusiasm: 70, technicality: 30, creativity: 60, empathy: 80 } },
    { name: 'Academic', values: { formality: 90, casualness: 10, enthusiasm: 20, technicality: 90, creativity: 40, empathy: 30 } },
    { name: 'Casual', values: { formality: 20, casualness: 90, enthusiasm: 60, technicality: 20, creativity: 70, empathy: 70 } },
  ], []);

  // Premium-only advanced presets
  const advancedPresets = useMemo(() => [
    { name: 'Executive', values: { formality: 95, casualness: 15, enthusiasm: 30, technicality: 60, creativity: 25, empathy: 40, confidence: 90, humor: 10, urgency: 70, clarity: 95 } },
    { name: 'Creative', values: { formality: 25, casualness: 75, enthusiasm: 85, technicality: 25, creativity: 95, empathy: 70, confidence: 70, humor: 80, urgency: 40, clarity: 60 } },
    { name: 'Technical', values: { formality: 70, casualness: 30, enthusiasm: 40, technicality: 95, creativity: 50, empathy: 30, confidence: 80, humor: 20, urgency: 60, clarity: 90 } },
    { name: 'Persuasive', values: { formality: 60, casualness: 50, enthusiasm: 80, technicality: 45, creativity: 70, empathy: 85, confidence: 90, humor: 60, urgency: 75, clarity: 85 } },
  ], []);

  const applyPreset = useCallback((preset: typeof presets[0]) => {
    if (!limits.canUsePresets) {
      return; // Only Pro/Premium users can apply presets
    }
    
    // Only apply values for controls available to the user's tier
    const newSettings = { ...settings };
    Object.entries(preset.values).forEach(([key, value]) => {
      if (limits.availableToneControls.includes(key)) {
        newSettings[key as keyof ToneSettings] = value;
      }
    });
    
    onChange(newSettings);
  }, [settings, onChange, limits]);

  const applyAdvancedPreset = useCallback((preset: typeof advancedPresets[0]) => {
    if (!limits.canUseAdvancedPresets) {
      return; // Only Premium users can apply advanced presets
    }
    
    // Apply all values since Premium users have access to all controls
    const newSettings = { ...settings };
    Object.entries(preset.values).forEach(([key, value]) => {
      newSettings[key as keyof ToneSettings] = value;
    });
    
    onChange(newSettings);
  }, [settings, onChange, limits]);

  const allSliders = useMemo(() => [
    {
      key: 'formality' as keyof ToneSettings,
      label: 'Formality',
      description: 'How formal or professional the tone should be',
      min: 'Casual',
      max: 'Formal',
      color: 'from-blue-400 to-indigo-500',
      tier: 'pro'
    },
    {
      key: 'casualness' as keyof ToneSettings,
      label: 'Conversational',
      description: 'How conversational and approachable the tone is',
      min: 'Reserved',
      max: 'Friendly',
      color: 'from-emerald-400 to-teal-500',
      tier: 'pro'
    },
    {
      key: 'enthusiasm' as keyof ToneSettings,
      label: 'Enthusiasm',
      description: 'How energetic and excited the tone sounds',
      min: 'Calm',
      max: 'Energetic',
      color: 'from-orange-400 to-pink-500',
      tier: 'pro'
    },
    {
      key: 'technicality' as keyof ToneSettings,
      label: 'Technical Detail',
      description: 'How technical and detailed the explanations are',
      min: 'Simple',
      max: 'Technical',
      color: 'from-purple-400 to-violet-500',
      tier: 'pro'
    },
    {
      key: 'creativity' as keyof ToneSettings,
      label: 'Creativity',
      description: 'How creative and innovative the language is',
      min: 'Conservative',
      max: 'Creative',
      color: 'from-pink-400 to-rose-500',
      tier: 'pro'
    },
    {
      key: 'empathy' as keyof ToneSettings,
      label: 'Empathy',
      description: 'How understanding and emotionally aware the tone is',
      min: 'Neutral',
      max: 'Empathetic',
      color: 'from-green-400 to-emerald-500',
      tier: 'pro'
    },
    {
      key: 'confidence' as keyof ToneSettings,
      label: 'Confidence',
      description: 'How confident and assertive the tone sounds',
      min: 'Humble',
      max: 'Confident',
      color: 'from-amber-400 to-yellow-500',
      tier: 'premium'
    },
    {
      key: 'humor' as keyof ToneSettings,
      label: 'Humor',
      description: 'How playful and humorous the tone is',
      min: 'Serious',
      max: 'Playful',
      color: 'from-cyan-400 to-blue-500',
      tier: 'premium'
    },
    {
      key: 'urgency' as keyof ToneSettings,
      label: 'Urgency',
      description: 'How urgent and time-sensitive the tone feels',
      min: 'Relaxed',
      max: 'Urgent',
      color: 'from-red-400 to-orange-500',
      tier: 'premium'
    },
    {
      key: 'clarity' as keyof ToneSettings,
      label: 'Clarity',
      description: 'How clear and straightforward the communication is',
      min: 'Complex',
      max: 'Clear',
      color: 'from-indigo-400 to-purple-500',
      tier: 'premium'
    }
  ], []);

  // Filter sliders based on user's subscription tier
  const availableSliders = useMemo(() => 
    allSliders.filter(slider => 
      limits.availableToneControls.includes(slider.key)
    ), [allSliders, limits.availableToneControls]);

  const lockedSliders = useMemo(() => 
    allSliders.filter(slider => 
      !limits.availableToneControls.includes(slider.key)
    ), [allSliders, limits.availableToneControls]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Tone Controls</h3>
              {limits.canUsePresets && (
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
              )}
              {limits.canUseAdvancedPresets && (
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
              )}
              {!limits.canModifyTone && (
                <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              {!limits.canModifyTone ? 'View-only - automatically set based on your writing samples' :
               limits.canUseAdvancedPresets ? `Custom tone fine-tuning with all ${limits.maxToneControls} controls` : 
               limits.canUsePresets ? `Advanced tone controls (${limits.maxToneControls} available)` : 
               'Automatically set based on your writing samples'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg self-end sm:self-auto"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Free Tier Upgrade Notice */}
      {!limits.canModifyTone && (
        <div className="mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h4 className="text-gray-800 font-medium text-sm sm:text-base">Tone Controls Locked</h4>
          </div>
          <p className="text-gray-700 text-xs sm:text-sm mb-3">
            Tone settings are automatically detected from your writing samples. Upgrade to unlock manual tone adjustment.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded px-2 py-1">
              Pro: 6 tone controls + presets
            </div>
            <div className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1">
              Premium: All 10 controls + custom fine-tuning
            </div>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-xs sm:text-sm"
          >
            <Crown className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" />
            Upgrade to Unlock Tone Controls
          </button>
        </div>
      )}

      {/* Basic Tone Presets for Pro users */}
      {limits.canUsePresets && (
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            <h4 className="text-sm sm:text-base font-medium text-gray-800">Quick Presets</h4>
            {!limits.canUseAdvancedPresets && (
              <div className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded px-2 py-1">
                Pro
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                disabled={!limits.canUsePresets}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs sm:text-sm font-medium rounded-lg border border-blue-200 hover:border-blue-300 transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Presets for Premium users only */}
      {limits.canUseAdvancedPresets && (
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
            <h4 className="text-sm sm:text-base font-medium text-gray-800">Advanced Presets</h4>
            <div className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Premium
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {advancedPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyAdvancedPreset(preset)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs sm:text-sm font-medium rounded-lg border border-amber-200 hover:border-amber-300 transition-all backdrop-blur-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Available Tone Controls */}
      {availableSliders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-green-600" />
            <h4 className="text-base font-medium text-gray-800">
              Available Controls ({availableSliders.length}/{allSliders.length})
            </h4>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2">
            {availableSliders.map((slider) => (
              <div key={slider.key} className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div>
                  <label className="text-sm sm:text-base lg:text-lg font-medium text-gray-800">
                    {slider.label}
                    {limits.canUseAdvancedPresets && (
                      <span className="ml-2 text-xs text-amber-600">
                        Fine-tuned
                      </span>
                    )}
                  </label>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{slider.description}</p>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                    <span>{slider.min}</span>
                    <span className="text-gray-800 font-medium">{settings[slider.key]}%</span>
                    <span>{slider.max}</span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings[slider.key]}
                      onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
                      disabled={!limits.canModifyTone}
                      className="w-full h-2 sm:h-2.5 lg:h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: `linear-gradient(to right, transparent 0%, transparent ${settings[slider.key]}%, rgba(229,231,235,1) ${settings[slider.key]}%, rgba(229,231,235,1) 100%)`
                      }}
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 sm:h-2.5 lg:h-3 bg-gradient-to-r ${slider.color} rounded-lg pointer-events-none transition-all duration-300`}
                      style={{ width: `${settings[slider.key]}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Tone Controls */}
      {lockedSliders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-gray-400" />
            <h4 className="text-base font-medium text-gray-600">
              Locked Controls ({lockedSliders.length})
            </h4>
            <div className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-1">
              {user?.subscription_tier === 'pro' ? 'Premium Only' : 'Pro/Premium Only'}
            </div>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2">
            {lockedSliders.map((slider) => (
              <div key={slider.key} className="space-y-2 sm:space-y-3 lg:space-y-4 opacity-50">
                <div>
                  <label className="text-sm sm:text-base lg:text-lg font-medium text-gray-600 flex items-center gap-2">
                    {slider.label}
                    <Lock className="w-3 h-3" />
                    {slider.tier === 'premium' && (
                      <Star className="w-3 h-3 text-amber-500" />
                    )}
                  </label>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">{slider.description}</p>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                    <span>{slider.min}</span>
                    <span className="text-gray-500 font-medium">50%</span>
                    <span>{slider.max}</span>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full h-2 sm:h-2.5 lg:h-3 bg-gray-200 rounded-lg">
                      <div className="w-1/2 h-full bg-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 sm:mt-6 lg:mt-8 pt-3 sm:pt-4 lg:pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={resetToDefaults}
          disabled={!limits.canModifyTone}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset available controls to defaults (50%)
        </button>
        
        {!limits.canUsePresets && (
          <button
            onClick={handleUpgradeClick}
            className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-all font-medium"
          >
            <Crown className="w-3 h-3 inline mr-1" />
            Upgrade to Pro for 6 tone controls
          </button>
        )}

        {limits.canUsePresets && !limits.canUseAdvancedPresets && (
          <button
            onClick={handleUpgradeClick}
            className="text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-all font-medium"
          >
            <Star className="w-3 h-3 inline mr-1" />
            Upgrade to Premium for all 10 controls
          </button>
        )}
      </div>
    </div>
  );
});

ToneControls.displayName = 'ToneControls';

export default ToneControls;