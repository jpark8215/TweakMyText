import React, { useState } from 'react';
import { Plus, X, FileText, Sparkles, ChevronRight, Zap } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-3xl mb-6 shadow-2xl shadow-purple-500/25">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
          Capture Your Writing Style
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Add 2-3 samples of your writing so we can learn your unique voice and tone
        </p>
      </div>

      {/* Existing Samples */}
      <div className="grid gap-6 mb-8">
        {samples.map((sample, index) => (
          <div key={sample.id} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-xl hover:shadow-2xl hover:bg-white/15 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-white text-lg">{sample.title}</h3>
              </div>
              <button
                onClick={() => removeSample(sample.id)}
                className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-300 leading-relaxed line-clamp-3 mb-3">{sample.content}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Zap className="w-3 h-3" />
              {sample.content.split(' ').length} words
            </div>
          </div>
        ))}
      </div>

      {/* Add New Sample */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Add Writing Sample</h3>
        </div>
        
        <div className="space-y-6">
          <input
            type="text"
            placeholder="Sample title (e.g., 'Email to colleague', 'Blog post excerpt')"
            value={newSample.title}
            onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
            className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm"
          />
          
          <textarea
            placeholder="Paste your writing sample here (100-300 words recommended)..."
            value={newSample.content}
            onChange={(e) => setNewSample({ ...newSample, content: e.target.value })}
            rows={6}
            className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none backdrop-blur-sm"
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {newSample.content.split(' ').filter(w => w.trim()).length} words
            </span>
            <button
              onClick={addSample}
              disabled={!newSample.content.trim() || !newSample.title.trim()}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4" />
              Add Sample
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-12 text-center">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-2xl font-semibold text-lg hover:from-purple-600 hover:via-pink-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/25"
        >
          Continue to Rewriter
          <ChevronRight className="w-6 h-6" />
        </button>
        {!canProceed && (
          <p className="text-sm text-gray-400 mt-4">Add at least 2 writing samples to continue</p>
        )}
      </div>
    </div>
  );
}