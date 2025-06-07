import React, { useState, useEffect } from 'react';
import { Send, Loader2, Sliders, Copy, Download, RefreshCw } from 'lucide-react';
import { WritingSample, RewriteResult, ToneSettings } from '../types';
import { rewriteText, analyzeToneFromSamples } from '../utils/styleAnalyzer';
import ToneControls from './ToneControls';
import ComparisonView from './ComparisonView';

interface TextRewriterProps {
  samples: WritingSample[];
  onBack: () => void;
}

export default function TextRewriter({ samples, onBack }: TextRewriterProps) {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [showToneControls, setShowToneControls] = useState(false);
  const [toneSettings, setToneSettings] = useState<ToneSettings>({
    formality: 50,
    casualness: 50,
    enthusiasm: 50,
    technicality: 50
  });

  // Analyze samples and set initial tone settings when component mounts or samples change
  useEffect(() => {
    if (samples.length > 0) {
      const analyzedTone = analyzeToneFromSamples(samples);
      setToneSettings(analyzedTone);
    }
  }, [samples]);

  const handleRewrite = async () => {
    if (!inputText.trim()) return;
    
    setIsRewriting(true);
    try {
      const rewriteResult = await rewriteText(inputText, samples, toneSettings);
      setResult(rewriteResult);
    } catch (error) {
      console.error('Rewrite failed:', error);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    if (!result) return;
    
    const exportData = {
      original: result.original,
      rewritten: result.rewritten,
      confidence: result.confidence,
      styleTags: result.styleTags,
      timestamp: result.timestamp,
      samples: samples.map(s => ({ title: s.title, preview: s.content.substring(0, 100) + '...' }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rewrite-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Samples
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Style Rewriter</h1>
          <p className="text-gray-600">Transform any text to match your writing style</p>
        </div>
        <button
          onClick={() => setShowToneControls(!showToneControls)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Sliders className="w-4 h-4" />
          Tone
        </button>
      </div>

      {/* Tone Controls */}
      {showToneControls && (
        <div className="mb-8">
          <ToneControls
            settings={toneSettings}
            onChange={setToneSettings}
            onClose={() => setShowToneControls(false)}
          />
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Input Text</h3>
        </div>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste the text you want to rewrite in your style..."
          rows={6}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
        />
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {inputText.split(' ').filter(w => w.trim()).length} words
          </span>
          <div className="flex gap-2">
            {result && (
              <button
                onClick={handleRewrite}
                disabled={isRewriting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Rewrite Again
              </button>
            )}
            <button
              onClick={handleRewrite}
              disabled={!inputText.trim() || isRewriting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Rewrite Text
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          <ComparisonView result={result} />
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleCopy(result.rewritten)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Rewritten
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}