import React from 'react';
import { Palette, Crown, Star, Lock } from 'lucide-react';
import { STYLE_FORMATTING_RULES } from '../utils/styleFormattingRules';
import { useAuth } from '../hooks/useAuth';
import { getSubscriptionLimits } from '../utils/subscriptionValidator';

interface StylePresetSelectorProps {
  selectedStyle: string | null;
  onStyleSelect: (style: string) => void;
  onOpenPricing?: () => void;
}

export default function StylePresetSelector({ 
  selectedStyle, 
  onStyleSelect, 
  onOpenPricing 
}: StylePresetSelectorProps) {
  const { user } = useAuth();
  const limits = getSubscriptionLimits(user);

  const availableStyles = Object.entries(STYLE_FORMATTING_RULES);
  
  // Determine which styles are available based on subscription
  const getStyleAvailability = (styleName: string) => {
    const premiumStyles = ['humorous', 'urgent', 'clear', 'confident'];
    const proStyles = ['creative', 'empathetic', 'technical'];
    
    if (premiumStyles.includes(styleName)) {
      return { available: user?.subscription_tier === 'premium', tier: 'premium' };
    } else if (proStyles.includes(styleName)) {
      return { available: ['pro', 'premium'].includes(user?.subscription_tier || ''), tier: 'pro' };
    }
    return { available: true, tier: 'free' };
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Palette className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Style Presets</h3>
          <p className="text-sm text-gray-600">Choose a specific writing style to apply</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableStyles.map(([key, style]) => {
          const availability = getStyleAvailability(key);
          const isSelected = selectedStyle === key;
          
          return (
            <button
              key={key}
              onClick={() => availability.available ? onStyleSelect(key) : onOpenPricing?.()}
              disabled={!availability.available && !onOpenPricing}
              className={`relative p-4 rounded-lg border transition-all text-left ${
                isSelected
                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400/20'
                  : availability.available
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-medium text-sm ${
                  availability.available ? 'text-gray-800' : 'text-gray-500'
                }`}>
                  {style.name}
                </h4>
                
                {!availability.available && (
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-gray-400" />
                    {availability.tier === 'premium' ? (
                      <Star className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Crown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                )}
              </div>
              
              <p className={`text-xs leading-relaxed mb-3 ${
                availability.available ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {style.description}
              </p>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Key characteristics:</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {style.characteristics.slice(0, 2).map((char, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{char}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!availability.available && (
                <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {availability.tier === 'premium' ? (
                        <Star className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Crown className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-600">
                      {availability.tier === 'premium' ? 'Premium' : 'Pro'} Only
                    </p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedStyle && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <p className="text-emerald-800 font-medium text-sm">
              {STYLE_FORMATTING_RULES[selectedStyle]?.name} Selected
            </p>
          </div>
          <p className="text-emerald-700 text-xs">
            Your text will be rewritten using the formatting rules and characteristics of this style.
          </p>
        </div>
      )}

      {!limits.canUsePresets && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <p className="text-amber-800 text-sm font-medium">Upgrade for Style Presets</p>
          </div>
          <p className="text-amber-700 text-xs mt-1">
            Pro and Premium users can select specific writing styles with detailed formatting instructions.
          </p>
        </div>
      )}
    </div>
  );
}