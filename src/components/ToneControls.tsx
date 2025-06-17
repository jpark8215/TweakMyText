import React from 'react';
import { X, BarChart3, Crown, Sparkles, Star, Settings, Lock } from 'lucide-react';
import { ToneSettings } from '../types';
import { useAuth } from '../hooks/useAuth';

interface ToneControlsProps {
  settings: ToneSettings;
  onChange: (settings: ToneSettings) => void;
  onClose: () => void;
}

export default function ToneControls({ settings, onChange, onClose }: ToneControlsProps) {
  const { user } = useAuth();

  const handleSliderChange = (key: keyof ToneSettings, value: number) => {
    // Check if user has permission to modify tone settings
    if (!user || user.subscription_tier === 'free') {
      return; // Free users cannot modify tone settings
    }
    
    onChange({
      ...settings,
      [key]: value
    });
  };

  const resetToDefaults = () => {
    if (!user || user.subscription_tier === 'free') {
      return; // Free users cannot reset tone settings
    }
    
    onChange({ 
      formality: 50, 
      casualness: 50, 
      enthusiasm: 50, 
      technicality: 50 
    });
  };

  const hasTonePresets = user && (user.subscription_tier === 'pro' || user.subscription_tier === 'premium');
  const hasCustomTuning = user && user.subscription_tier === 'premium';
  const canModifyTone = user && user.subscription_tier !== 'free';

  const presets = [
    { name: 'Professional', values: { formality: 80, casualness: 20, enthusiasm: 40, technicality: 70 } },
    { name: 'Friendly', values: { formality: 30, casualness: 80, enthusiasm: 70, technicality: 30 } },
    { name: 'Academic', values: { formality: 90, casualness: 10, enthusiasm: 20, technicality: 90 } },
    { name: 'Casual', values: { formality: 20, casualness: 90, enthusiasm: 60, technicality: 20 } },
  ];

  // Premium-only advanced presets
  const advancedPresets = [
    { name: 'Executive', values: { formality: 95, casualness: 15, enthusiasm: 30, technicality: 60 } },
    { name: 'Creative', values: { formality: 25, casualness: 75, enthusiasm: 85, technicality: 25 } },
    { name: 'Technical', values: { formality: 70, casualness: 30, enthusiasm: 40, technicality: 95 } },
    { name: 'Persuasive', values: { formality: 60, casualness: 50, enthusiasm: 80, technicality: 45 } },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    if (!hasTonePresets) {
      return; // Only Pro/Premium users can apply presets
    }
    onChange(preset.values);
  };

  const applyAdvancedPreset = (preset: typeof advancedPresets[0]) => {
    if (!hasCustomTuning) {
      return; // Only Premium users can apply advanced presets
    }
    onChange(preset.values);
  };

  const sliders = [
    {
      key: 'formality' as keyof ToneSettings,
      label: 'Formality',
      description: 'How formal or professional the tone should be',
      min: 'Casual',
      max: 'Formal',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      key: 'casualness' as keyof ToneSettings,
      label: 'Conversational',
      description: 'How conversational and approachable the tone is',
      min: 'Reserved',
      max: 'Friendly',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      key: 'enthusiasm' as keyof ToneSettings,
      label: 'Enthusiasm',
      description: 'How energetic and excited the tone sounds',
      min: 'Calm',
      max: 'Energetic',
      color: 'from-orange-400 to-pink-500'
    },
    {
      key: 'technicality' as keyof ToneSettings,
      label: 'Technical Detail',
      description: 'How technical and detailed the explanations are',
      min: 'Simple',
      max: 'Technical',
      color: 'from-purple-400 to-violet-500'
    }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Tone Controls</h3>
              {hasTonePresets && (
                <Crown className="w-4 h-4 text-yellow-400" />
              )}
              {hasCustomTuning && (
                <Star className="w-4 h-4 text-yellow-400" />
              )}
              {!canModifyTone && (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              {!canModifyTone ? 'View-only - automatically set based on your writing samples' :
               hasCustomTuning ? 'Custom tone fine-tuning with advanced presets' : 
               hasTonePresets ? 'Advanced tone controls with presets' : 
               'Automatically set based on your writing samples'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-white/10 rounded-lg self-end sm:self-auto"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Free Tier Upgrade Notice */}
      {!canModifyTone && (
        <div className="mb-6 sm:mb-8 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h4 className="text-white font-medium">Tone Controls Locked</h4>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            Tone settings are automatically detected from your writing samples. Upgrade to Pro or Premium to customize tone controls.
          </p>
          <div className="flex gap-2">
            <div className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-1">
              Pro: Manual tone adjustment + presets
            </div>
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
              Premium: Custom fine-tuning + advanced presets
            </div>
          </div>
        </div>
      )}

      {/* Basic Tone Presets for Pro users */}
      {hasTonePresets && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-base font-medium text-white">Quick Presets</h4>
            {!hasCustomTuning && (
              <div className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-1">
                Pro
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                disabled={!hasTonePresets}
                className="px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 text-xs sm:text-sm font-medium rounded-lg border border-cyan-400/30 hover:border-cyan-400/50 transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Presets for Premium users only */}
      {hasCustomTuning && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-yellow-400" />
            <h4 className="text-base font-medium text-white">Advanced Presets</h4>
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Premium
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {advancedPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyAdvancedPreset(preset)}
                className="px-3 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 text-xs sm:text-sm font-medium rounded-lg border border-yellow-400/30 hover:border-yellow-400/50 transition-all backdrop-blur-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        {sliders.map((slider) => (
          <div key={slider.key} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-base sm:text-lg font-medium text-white">
                {slider.label}
                {hasCustomTuning && (
                  <span className="ml-2 text-xs text-yellow-400">
                    Fine-tuned
                  </span>
                )}
                {!canModifyTone && (
                  <span className="ml-2 text-xs text-gray-400">
                    Auto-detected
                  </span>
                )}
              </label>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{slider.description}</p>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                <span>{slider.min}</span>
                <span className="text-white font-medium">{settings[slider.key]}%</span>
                <span>{slider.max}</span>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings[slider.key]}
                  onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
                  disabled={!canModifyTone}
                  className="w-full h-2.5 sm:h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, transparent 0%, transparent ${settings[slider.key]}%, rgba(255,255,255,0.2) ${settings[slider.key]}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
                <div 
                  className={`absolute top-0 left-0 h-2.5 sm:h-3 bg-gradient-to-r ${slider.color} rounded-lg pointer-events-none transition-all duration-300 ${!canModifyTone ? 'opacity-50' : ''}`}
                  style={{ width: `${settings[slider.key]}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={resetToDefaults}
          disabled={!canModifyTone}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to defaults (50%)
        </button>
        
        {!hasTonePresets && (
          <div className="text-xs text-gray-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <Crown className="w-3 h-3 text-yellow-400 inline mr-1" />
            Upgrade to Pro for tone presets
          </div>
        )}

        {hasTonePresets && !hasCustomTuning && (
          <div className="text-xs text-gray-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <Star className="w-3 h-3 text-yellow-400 inline mr-1" />
            Upgrade to Premium for custom fine-tuning
          </div>
        )}
      </div>
    </div>
  );
}