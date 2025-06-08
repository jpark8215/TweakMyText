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
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Tone Controls</h3>
            <p className="text-sm text-gray-400">Automatically set based on your writing samples</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {sliders.map((slider) => (
          <div key={slider.key} className="space-y-4">
            <div>
              <label className="text-lg font-medium text-white">
                {slider.label}
              </label>
              <p className="text-sm text-gray-400 mt-1">{slider.description}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-400">
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
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, transparent 0%, transparent ${settings[slider.key]}%, rgba(255,255,255,0.2) ${settings[slider.key]}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
                <div 
                  className={`absolute top-0 left-0 h-3 bg-gradient-to-r ${slider.color} rounded-lg pointer-events-none transition-all duration-300`}
                  style={{ width: `${settings[slider.key]}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-white/20">
        <button
          onClick={resetToDefaults}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          Reset to defaults (50%)
        </button>
      </div>
    </div>
  );
}