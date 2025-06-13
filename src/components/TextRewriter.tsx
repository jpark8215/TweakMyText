import React, { useState, useEffect } from 'react';
import { Send, Loader2, Sliders, Copy, Download, RefreshCw, ArrowLeft, Zap, AlertCircle, Calendar, Clock } from 'lucide-react';
import { WritingSample, RewriteResult, ToneSettings } from '../types';
import { rewriteText, analyzeToneFromSamples } from '../utils/styleAnalyzer';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
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

  const { user, updateCredits } = useAuth();

  // Analyze samples and set initial tone settings when component mounts or samples change
  useEffect(() => {
    if (samples.length > 0) {
      const analyzedTone = analyzeToneFromSamples(samples);
      setToneSettings(analyzedTone);
    }
  }, [samples]);

  const handleRewrite = async () => {
    if (!inputText.trim() || !user) return;
    
    // Check if user has credits
    if (user.credits_remaining <= 0) {
      alert('You have no credits remaining. Please wait for your daily reset or upgrade your plan.');
      return;
    }

    // Check daily limit for free users
    if (user.subscription_tier === 'free' && user.daily_credits_used >= 3) {
      alert('You have reached your daily limit of 3 rewrites. Credits reset at midnight UTC.');
      return;
    }

    // Check monthly limit for free users
    if (user.subscription_tier === 'free' && user.monthly_credits_used >= 90) {
      alert('You have reached your monthly limit of 90 rewrites. Limit resets on your signup anniversary.');
      return;
    }
    
    setIsRewriting(true);
    try {
      const rewriteResult = await rewriteText(inputText, samples, toneSettings);
      setResult(rewriteResult);

      // Deduct credits and save to database
      const creditsUsed = 1;
      const { error } = await updateCredits(creditsUsed);
      
      if (error) {
        alert(error.message);
        return;
      }

      // Save rewrite history
      await supabase.from('rewrite_history').insert({
        user_id: user.id,
        original_text: rewriteResult.original,
        rewritten_text: rewriteResult.rewritten,
        confidence: rewriteResult.confidence,
        style_tags: rewriteResult.styleTags,
        credits_used: creditsUsed,
      });

    } catch (error) {
      console.error('Rewrite failed:', error);
      alert('Rewrite failed. Please try again.');
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

  const canRewrite = user && user.credits_remaining > 0 && inputText.trim() && 
    (user.subscription_tier !== 'free' || (user.daily_credits_used < 3 && user.monthly_credits_used < 90));

  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursUntilReset;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-gray-300 hover:text-white transition-colors hover:bg-white/10 rounded-lg sm:rounded-xl text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Samples
        </button>
        
        <div className="text-center flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-1 sm:mb-2">
            Style Rewriter
          </h1>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg">Transform any text to match your writing style</p>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">{user.credits_remaining}</span>
              {user.subscription_tier === 'free' && (
                <span className="text-xs text-gray-400">
                  ({user.daily_credits_used}/3 today)
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setShowToneControls(!showToneControls)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg sm:rounded-xl transition-all backdrop-blur-sm border border-white/20 text-sm sm:text-base"
          >
            <Sliders className="w-4 h-4" />
            Tone Controls
          </button>
        </div>
      </div>

      {/* Credits Warning */}
      {user && user.subscription_tier === 'free' && (
        <div className="mb-6 sm:mb-8 space-y-4">
          {user.credits_remaining === 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-300 font-medium">No credits remaining</p>
                  <p className="text-red-400/80 text-sm">
                    Your daily credits will reset in {getTimeUntilReset()} hours at midnight UTC.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {user.daily_credits_used >= 3 && user.credits_remaining > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-yellow-300 font-medium">Daily limit reached</p>
                  <p className="text-yellow-400/80 text-sm">
                    You've used your 3 daily credits. Reset in {getTimeUntilReset()} hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user.monthly_credits_used >= 75 && user.monthly_credits_used < 90 && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-orange-300 font-medium">
                    {90 - user.monthly_credits_used} credits left this month
                  </p>
                  <p className="text-orange-400/80 text-sm">
                    Monthly limit resets on day {user.monthly_reset_date} of each month.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user.monthly_credits_used >= 90 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-300 font-medium">Monthly limit reached</p>
                  <p className="text-red-400/80 text-sm">
                    You've used all 90 monthly credits. Limit resets on day {user.monthly_reset_date}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tone Controls */}
      {showToneControls && (
        <div className="mb-6 sm:mb-8">
          <ToneControls
            settings={toneSettings}
            onChange={setToneSettings}
            onClose={() => setShowToneControls(false)}
          />
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-6 sm:p-8 shadow-xl mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Input Text</h3>
        </div>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste the text you want to rewrite in your style..."
          rows={5}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none backdrop-blur-sm text-sm sm:text-base"
        />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 mt-4 sm:mt-6">
          <span className="text-sm text-gray-400">
            {inputText.split(' ').filter(w => w.trim()).length} words
          </span>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {result && (
              <button
                onClick={handleRewrite}
                disabled={isRewriting || !canRewrite}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg sm:rounded-xl transition-colors border border-white/20 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Rewrite Again
              </button>
            )}
            <button
              onClick={handleRewrite}
              disabled={!canRewrite || isRewriting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg sm:rounded-xl font-medium hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25 text-sm sm:text-base"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  Rewrite Text
                  {user && user.subscription_tier === 'free' && (
                    <span className="text-xs opacity-75">
                      ({user.credits_remaining} left today)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 sm:space-y-8">
          <ComparisonView result={result} />
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => handleCopy(result.rewritten)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg sm:rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25 text-sm sm:text-base"
            >
              <Copy className="w-4 h-4" />
              Copy Rewritten
            </button>
            <button
              onClick={handleExport}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg sm:rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
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