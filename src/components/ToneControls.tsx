import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { ToneSettings } from '../types';

interface ToneControlsProps {
  settings: ToneSettings;
  onChange: (settings: ToneSettings) => void;
  onClose: () => void;
}

export default function ToneControls({ settings, onChange, onClose }: ToneControlsProps) {
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

  const sliders = [
    {
      key: 'formality' as keyof ToneSettings,
      label: 'Formality',
      description: 'How formal or professional the tone should be',
      min: 'Casual',
      max: 'Formal'
    },
    {
      key: 'casualness' as keyof ToneSettings,
      label: 'Conversational',
      description: 'How conversational and approachable the tone is',
      min: 'Reserved',
      max: 'Friendly'
    },
    {
      key: 'enthusiasm' as keyof ToneSettings,
      label: 'Enthusiasm',
      description: 'How energetic and excited the tone sounds',
      min: 'Calm',
      max: 'Energetic'
    },
    {
      key: 'technicality' as keyof ToneSettings,
      label: 'Technical Detail',
      description: 'How technical and detailed the explanations are',
      min: 'Simple',
      max: 'Technical'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tone Controls</h3>
            <p className="text-sm text-gray-500">Automatically set based on your writing samples</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sliders.map((slider) => (
          <div key={slider.key} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-900">
                {slider.label}
              </label>
              <p className="text-xs text-gray-500 mt-1">{slider.description}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{slider.min}</span>
                <span>{settings[slider.key]}%</span>
                <span>{slider.max}</span>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings[slider.key]}
                  onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${settings[slider.key]}%, #E5E7EB ${settings[slider.key]}%, #E5E7EB 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={resetToDefaults}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          Reset to defaults (50%)
        </button>
      </div>
    </div>
  );
}