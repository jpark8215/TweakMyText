import React, { useState } from 'react';
import { Plus, X, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { WritingSample } from '../types';

interface StyleCaptureProps {
  samples: WritingSample[];
  onSamplesChange: (samples: WritingSample[]) => void;
  onNext: () => void;
}

export default function StyleCapture({ samples, onSamplesChange, onNext }: StyleCaptureProps) {
  const [newSample, setNewSample] = useState({ title: '', content: '' });

  const addSample = () => {
    if (newSample.content.trim() && newSample.title.trim()) {
      const sample: WritingSample = {
        id: Date.now().toString(),
        title: newSample.title,
        content: newSample.content,
        createdAt: new Date()
      };
      onSamplesChange([...samples, sample]);
      setNewSample({ title: '', content: '' });
    }
  };

  const removeSample = (id: string) => {
    onSamplesChange(samples.filter(s => s.id !== id));
  };

  const canProceed = samples.length >= 2;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capture Your Writing Style</h1>
        <p className="text-gray-600">Add 2-3 samples of your writing so we can learn your unique voice</p>
      </div>

      {/* Existing Samples */}
      <div className="grid gap-4 mb-8">
        {samples.map((sample, index) => (
          <div key={sample.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-gray-900">{sample.title}</h3>
              </div>
              <button
                onClick={() => removeSample(sample.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{sample.content}</p>
            <div className="mt-3 text-xs text-gray-400">
              {sample.content.split(' ').length} words
            </div>
          </div>
        ))}
      </div>

      {/* Add New Sample */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Add Writing Sample</h3>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Sample title (e.g., 'Email to colleague', 'Blog post excerpt')"
            value={newSample.title}
            onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
          
          <textarea
            placeholder="Paste your writing sample here (100-300 words recommended)..."
            value={newSample.content}
            onChange={(e) => setNewSample({ ...newSample, content: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {newSample.content.split(' ').filter(w => w.trim()).length} words
            </span>
            <button
              onClick={addSample}
              disabled={!newSample.content.trim() || !newSample.title.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Sample
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-8 text-center">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          Continue to Rewriter
          <ChevronRight className="w-5 h-5" />
        </button>
        {!canProceed && (
          <p className="text-sm text-gray-500 mt-2">Add at least 2 writing samples to continue</p>
        )}
      </div>
    </div>
  );
}