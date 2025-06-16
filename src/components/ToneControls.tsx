import React from 'react';
import { X, BarChart3, Crown, Sparkles } from 'lucide-react';
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
    onChange({
      ...settings,
      [key]: value
    });
  };

  const resetToDefaults = () => {
    onChange({ 
      formality: 50, 
      casualness: 50, 
      enthusiasm: 50, 
      technicality: 50 
    });
  };

  const hasTonePresets = user && (user.subscription_tier === 'pro' || user.subscription_tier === 'premium');
  const hasAdvancedControls = user && user.subscription_tier === 'premium';

  const presets = [
    { name: 'Professional', values: { formality: 80, casualness: 20, enthusiasm: 40, technicality: 70 } },
    { name: 'Friendly', values: { formality: 30, casualness: 80, enthusiasm: 70, technicality: 30 } },
    { name: 'Academic', values: { formality: 90, casualness: 10, enthusiasm: 20, technicality: 90 } },
    { name: 'Casual', values: { formality: 20, casualness: 90, enthusiasm: 60, technicality: 20 } },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
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
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              {hasTonePresets ? 'Advanced tone controls with presets' : 'Automatically set based on your writing samples'}
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

      {/* Tone Presets for Pro/Premium users */}
      {hasTonePresets && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-base font-medium text-white">Quick Presets</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 text-xs sm:text-sm font-medium rounded-lg border border-cyan-400/30 hover:border-cyan-400/50 transition-all backdrop-blur-sm"
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
                  className="w-full h-2.5 sm:h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, transparent 0%, transparent ${settings[slider.key]}%, rgba(255,255,255,0.2) ${settings[slider.key]}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
                <div 
                  className={`absolute top-0 left-0 h-2.5 sm:h-3 bg-gradient-to-r ${slider.color} rounded-lg pointer-events-none transition-all duration-300`}
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
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          Reset to defaults (50%)
        </button>
        
        {!hasTonePresets && (
          <div className="text-xs text-gray-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <Crown className="w-3 h-3 text-yellow-400 inline mr-1" />
            Upgrade to Pro for tone presets
          </div>
        )}
      </div>
    </div>
  );
}