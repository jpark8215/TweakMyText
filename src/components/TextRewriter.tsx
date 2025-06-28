import React, { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, Sliders, Copy, Download, RefreshCw, ArrowLeft, Zap, AlertCircle, Calendar, Clock, Crown, Star, CheckCircle, History } from 'lucide-react';
import { WritingSample, RewriteResult, ToneSettings } from '../types';
import { secureRewriteText, analyzeToneFromSamples } from '../utils/secureStyleAnalyzer';
import { validateToneAccess, validatePresetAccess, getSubscriptionLimits } from '../utils/subscriptionValidator';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { createExportService } from '../services/exportService';
import ToneControls from './ToneControls';
import ComparisonView from './ComparisonView';
import RewriteHistoryStats from './RewriteHistoryStats';
import RewriteHistoryModal from './RewriteHistoryModal';
import { secureLog, handleError } from '../utils/errorHandler';

interface TextRewriterProps {
  samples: WritingSample[];
  onBack: () => void;
  onOpenPricing?: () => void;
}

export default function TextRewriter({ samples, onBack, onOpenPricing }: TextRewriterProps) {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [showToneControls, setShowToneControls] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHistoryStats, setShowHistoryStats] = useState(false);
  const [toneSettings, setToneSettings] = useState<ToneSettings>({
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
  });
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [rewriteSaveStatus, setRewriteSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const { user, updateTokens, updateExports, saveRewriteHistory } = useAuth();

  // Create export service instance
  const exportService = useMemo(() => createExportService(updateExports), [updateExports]);

  // Analyze samples and set initial tone settings when component mounts or samples change
  useEffect(() => {
    if (samples.length > 0) {
      try {
        const analyzedTone = analyzeToneFromSamples(samples, user);
        setToneSettings(analyzedTone);
      } catch (error) {
        const appError = handleError(error, 'tone_analysis');
        secureLog('Tone analysis limited by subscription tier:', { error: appError.message });
        // Keep default settings for free users
      }
    }
  }, [samples, user]);

  const limits = useMemo(() => getSubscriptionLimits(user), [user?.subscription_tier]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const estimateTokenUsage = (text: string) => {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  };

  const handleRewrite = async () => {
    if (!inputText.trim() || !user) return;
    
    setSecurityError(null);
    setRewriteSaveStatus(null);
    
    const estimatedTokens = estimateTokenUsage(inputText);
    
    // Check if user has tokens
    if (user.tokens_remaining <= 0) {
      alert('You have no tokens remaining. Please wait for your daily reset or upgrade your plan.');
      return;
    }

    // Check if estimated usage exceeds remaining tokens
    if (estimatedTokens > user.tokens_remaining) {
      alert(`This text requires approximately ${formatTokens(estimatedTokens)} tokens, but you only have ${formatTokens(user.tokens_remaining)} remaining.`);
      return;
    }

    // Check daily limit for free users
    if (user.subscription_tier === 'free' && user.daily_tokens_used >= 100000) {
      alert('You have reached your daily limit of 100,000 tokens. Tokens reset at midnight UTC.');
      return;
    }

    // Check monthly limit
    const monthlyLimit = limits.monthlyLimit;
    if (user.monthly_tokens_used >= monthlyLimit) {
      alert(`You have reached your monthly limit of ${formatTokens(monthlyLimit)} tokens. ${user.subscription_tier === 'free' ? 'Upgrade to Pro or Premium for more tokens.' : 'Limit resets on your signup anniversary.'}`);
      return;
    }
    
    setIsRewriting(true);
    try {
      // Perform secure rewrite with subscription validation
      const rewriteResult = await secureRewriteText(inputText, samples, toneSettings, user);
      
      setResult(rewriteResult);

      // Deduct tokens and save to database
      const { error: tokenError } = await updateTokens(estimatedTokens);
      
      if (tokenError) {
        alert(tokenError.message);
        return;
      }

      // Save rewrite history with enhanced error handling (only for Pro/Premium)
      if (user.subscription_tier === 'pro' || user.subscription_tier === 'premium') {
        setRewriteSaveStatus('saving');
        
        const { error: saveError } = await saveRewriteHistory({
          original_text: rewriteResult.original,
          rewritten_text: rewriteResult.rewritten,
          confidence: rewriteResult.confidence,
          style_tags: rewriteResult.styleTags,
        });

        if (saveError) {
          secureLog('Failed to save rewrite history:', { error: saveError.message });
          setRewriteSaveStatus('error');
          
          // Show user-friendly error message based on subscription tier
          if (user.subscription_tier === 'premium') {
            alert('Warning: Your rewrite was completed but there was an issue saving it to your unlimited history. Please contact support if this continues.');
          } else if (user.subscription_tier === 'pro') {
            alert('Warning: Your rewrite was completed but there was an issue saving it to your history. Your result is still available for export.');
          }
        } else {
          secureLog('Rewrite history saved successfully');
          setRewriteSaveStatus('saved');
          
          // Trigger stats refresh
          setStatsRefreshTrigger(prev => prev + 1);
          
          // Auto-hide save status after 3 seconds
          setTimeout(() => {
            setRewriteSaveStatus(null);
          }, 3000);
        }
      }

    } catch (error: any) {
      const appError = handleError(error, 'rewrite_text');
      secureLog('Rewrite failed:', { error: appError.message });
      if (appError.message.includes('subscription') || appError.message.includes('requires')) {
        setSecurityError(appError.message);
      } else {
        alert('Rewrite failed. Please try again.');
      }
    } finally {
      setIsRewriting(false);
    }
  };

  const handleToneSettingsChange = (newSettings: ToneSettings) => {
    try {
      // Validate tone modification access
      if (user?.subscription_tier === 'free') {
        validateToneAccess(user, 'modify_tone');
      }
      setToneSettings(newSettings);
      setSecurityError(null);
    } catch (error: any) {
      const appError = handleError(error, 'tone_settings_change');
      setSecurityError(appError.message);
      secureLog('Tone modification blocked:', { error: appError.message });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExport = async () => {
    if (!result || !user) return;
    
    secureLog('Export attempt from TextRewriter:', {
      userTier: user.subscription_tier,
      currentExports: user.monthly_exports_used,
      hasResult: !!result
    });
    
    try {
      const exportData = {
        original: result.original,
        rewritten: result.rewritten,
        confidence: result.confidence,
        styleTags: result.styleTags,
        timestamp: result.timestamp,
        samples: samples.map(s => ({ title: s.title, preview: s.content.substring(0, 100) + '...' })),
        tier: user.subscription_tier,
        analysisType: limits.hasExtendedAnalysis ? 'Extended' : limits.hasAdvancedAnalysis ? 'Advanced' : 'Basic',
        processingPriority: limits.hasPriorityProcessing ? (user.subscription_tier === 'premium' ? '3x Speed' : '2x Speed') : 'Standard',
        securityValidated: true,
        rewriteSaved: rewriteSaveStatus === 'saved',
      };
      
      const filename = `rewrite-${new Date().toISOString().split('T')[0]}.json`;
      
      // Use centralized export service
      await exportService.exportData(exportData, filename, user);
      
      secureLog('Export completed successfully from TextRewriter');
    } catch (error) {
      const appError = handleError(error, 'export_rewrite');
      secureLog('Export failed:', { error: appError.message });
      alert(appError.message);
    }
  };

  const canRewrite = user && user.tokens_remaining > 0 && inputText.trim() && 
    (user.subscription_tier !== 'free' || (user.daily_tokens_used < 100000 && user.monthly_tokens_used < 1000000)) &&
    user.monthly_tokens_used < limits.monthlyLimit;

  const canExport = user && result;

  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursUntilReset;
  };

  const hasHistoryAccess = user?.subscription_tier === 'pro' || user?.subscription_tier === 'premium';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header - Centered and Responsive */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8 lg:mb-10">
          <button
            onClick={onBack}
            className="self-start mb-4 inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors hover:bg-white/50 rounded-lg sm:rounded-xl text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back to Samples
          </button>
          
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
              Style Rewriter
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">
              Transform any text to match your writing style
              {limits.hasExtendedAnalysis && (
                <span className="block text-amber-600 text-sm mt-1 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" />
                  Extended Analysis {limits.hasPriorityProcessing && '• Fastest Processing (3x)'}
                </span>
              )}
              {limits.hasAdvancedAnalysis && !limits.hasExtendedAnalysis && (
                <span className="block text-blue-600 text-sm mt-1">
                  ✨ Advanced Analysis {limits.hasPriorityProcessing && '• Priority Processing (2x)'}
                </span>
              )}
            </p>
          </div>
          
          {/* Centered Controls */}
          <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
            {/* Token Display */}
            {user && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-gray-800 font-medium">{formatTokens(user.tokens_remaining)}</span>
                {user.subscription_tier === 'free' && (
                  <span className="text-xs text-gray-500">
                    ({formatTokens(user.daily_tokens_used)}/100K today)
                  </span>
                )}
                {user.subscription_tier !== 'free' && (
                  <span className="text-xs text-gray-500">
                    ({formatTokens(user.monthly_tokens_used)}/{formatTokens(limits.monthlyLimit)} month)
                  </span>
                )}
              </div>
            )}
            
            {/* Control Buttons - Centered */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowToneControls(!showToneControls)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all backdrop-blur-sm border border-gray-200 text-sm"
              >
                <Sliders className="w-4 h-4" />
                <span>Tone Controls</span>
                {limits.canUsePresets && (
                  <Crown className="w-3 h-3 text-amber-500" />
                )}
                {limits.canUseAdvancedPresets && (
                  <Star className="w-3 h-3 text-amber-500" />
                )}
              </button>

              {/* Rewrite Summary Button */}
              <button
                onClick={() => {
                  if (hasHistoryAccess) {
                    setShowHistoryStats(!showHistoryStats);
                  } else {
                    setShowHistoryModal(true);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all backdrop-blur-sm border border-gray-200 text-sm"
              >
                <History className="w-4 h-4" />
                <span>Rewrite Summary</span>
                {hasHistoryAccess && (
                  user.subscription_tier === 'premium' ? (
                    <Star className="w-3 h-3 text-amber-500" />
                  ) : (
                    <Crown className="w-3 h-3 text-blue-500" />
                  )
                )}
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all backdrop-blur-sm border border-gray-200 text-sm"
              >
                <History className="w-4 h-4" />
                <span>View History</span>
                {hasHistoryAccess && (
                  user.subscription_tier === 'premium' ? (
                    <Star className="w-3 h-3 text-amber-500" />
                  ) : (
                    <Crown className="w-3 h-3 text-blue-500" />
                  )
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rewrite Summary - Only show when button is clicked */}
        {showHistoryStats && (
          <div className="max-w-4xl mx-auto">
            <RewriteHistoryStats 
              onOpenPricing={onOpenPricing}
              refreshTrigger={statsRefreshTrigger}
            />
          </div>
        )}

        {/* Security Error Alert */}
        {securityError && (
          <div className="max-w-4xl mx-auto mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium text-sm sm:text-base">Access Restricted</p>
                <p className="text-red-600 text-xs sm:text-sm">{securityError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rewrite Save Status */}
        {rewriteSaveStatus && (
          <div className="max-w-4xl mx-auto mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              {rewriteSaveStatus === 'saving' && (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-blue-700 font-medium text-sm sm:text-base">Saving Rewrite</p>
                    <p className="text-blue-600 text-xs sm:text-sm">Your rewrite is being saved to your history...</p>
                  </div>
                </>
              )}
              {rewriteSaveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-700 font-medium text-sm sm:text-base">Rewrite Saved</p>
                    <p className="text-emerald-600 text-xs sm:text-sm">
                      {user?.subscription_tier === 'premium' 
                        ? 'Saved to your unlimited rewrite history with full analytics'
                        : 'Successfully saved to your rewrite history'
                      }
                    </p>
                  </div>
                </>
              )}
              {rewriteSaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-amber-700 font-medium text-sm sm:text-base">Save Warning</p>
                    <p className="text-amber-600 text-xs sm:text-sm">
                      Rewrite completed but couldn't save to history. Your result is still available for export.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Token Warnings - Centered */}
        {user && (
          <div className="max-w-4xl mx-auto mb-4 sm:mb-6 lg:mb-8 space-y-3 sm:space-y-4">
            {user.tokens_remaining === 0 && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-700 font-medium text-sm sm:text-base">No tokens remaining</p>
                    <p className="text-red-600 text-xs sm:text-sm">
                      {user.subscription_tier === 'free' 
                        ? `Your daily tokens will reset in ${getTimeUntilReset()} hours at midnight UTC.`
                        : 'Your monthly tokens will reset on your signup anniversary.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {user.subscription_tier === 'free' && user.daily_tokens_used >= 100000 && user.tokens_remaining > 0 && (
              <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-amber-800 font-medium text-sm sm:text-base">Daily limit reached</p>
                    <p className="text-amber-700 text-xs sm:text-sm">
                      You've used your 100,000 daily tokens. Reset in {getTimeUntilReset()} hours.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {user.monthly_tokens_used >= limits.monthlyLimit - 100000 && user.monthly_tokens_used < limits.monthlyLimit && (
              <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="text-orange-800 font-medium text-sm sm:text-base">
                      {formatTokens(limits.monthlyLimit - user.monthly_tokens_used)} tokens left this month
                    </p>
                    <p className="text-orange-700 text-xs sm:text-sm">
                      Monthly limit resets on day {user.monthly_reset_date} of each month.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {user.monthly_tokens_used >= limits.monthlyLimit && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-700 font-medium text-sm sm:text-base">Monthly limit reached</p>
                    <p className="text-red-600 text-xs sm:text-sm">
                      You've used all {formatTokens(limits.monthlyLimit)} monthly tokens. Limit resets on day {user.monthly_reset_date}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Export limit warning */}
            {user.subscription_tier !== 'premium' && (user.monthly_exports_used || 0) >= limits.exportLimit - 2 && (
              <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="text-purple-800 font-medium text-sm sm:text-base">
                      {limits.exportLimit - (user.monthly_exports_used || 0)} exports left this month
                    </p>
                    <p className="text-purple-700 text-xs sm:text-sm">
                      {user.subscription_tier === 'free' 
                        ? 'Free users can export up to 5 results per month. Upgrade for more exports.'
                        : 'Pro users can export up to 200 results per month. Upgrade to Premium for unlimited exports.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tone Controls - Centered */}
        {showToneControls && (
          <div className="max-w-6xl mx-auto mb-4 sm:mb-6 lg:mb-8">
            <ToneControls
              settings={toneSettings}
              onChange={handleToneSettingsChange}
              onClose={() => setShowToneControls(false)}
              onOpenPricing={onOpenPricing}
            />
          </div>
        )}

        {/* Input Section - Centered */}
        <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 shadow-lg mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
              <Send className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Input Text</h3>
            {limits.hasPriorityProcessing && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                <Crown className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700">
                  {user?.subscription_tier === 'premium' ? 'Fastest (3x)' : 'Priority (2x)'}
                </span>
              </div>
            )}
          </div>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste the text you want to rewrite in your style..."
            rows={4}
            className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-md sm:rounded-lg lg:rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none backdrop-blur-sm text-sm sm:text-base"
          />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 mt-3 sm:mt-4 lg:mt-6">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{inputText.split(' ').filter(w => w.trim()).length} words</span>
              <span>~{formatTokens(estimateTokenUsage(inputText))} tokens</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {result && (
                <button
                  onClick={handleRewrite}
                  disabled={isRewriting || !canRewrite}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 rounded-md sm:rounded-lg lg:rounded-xl transition-colors border border-gray-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Rewrite Again</span>
                  <span className="sm:hidden">Again</span>
                </button>
              )}
              <button
                onClick={handleRewrite}
                disabled={!canRewrite || isRewriting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md sm:rounded-lg lg:rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
              >
                {isRewriting ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">
                      {limits.hasPriorityProcessing ? 
                        (user?.subscription_tier === 'premium' ? 'Processing (Fastest)...' : 'Processing (Priority)...') : 
                        'Rewriting...'
                      }
                    </span>
                    <span className="sm:hidden">Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Rewrite Text</span>
                    <span className="sm:hidden">Rewrite</span>
                    {user && user.subscription_tier === 'free' && (
                      <span className="text-xs opacity-75 hidden lg:inline">
                        ({formatTokens(user.tokens_remaining)} left today)
                      </span>
                    )}
                    {user && user.subscription_tier !== 'free' && (
                      <span className="text-xs opacity-75 hidden lg:inline">
                        ({formatTokens(limits.monthlyLimit - user.monthly_tokens_used)} left)
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section - Centered */}
        {result && (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
            <ComparisonView result={result} />
            
            {/* Action Buttons - Centered */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => handleCopy(result.rewritten)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md sm:rounded-lg lg:rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25 text-sm sm:text-base"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy Rewritten</span>
                <span className="sm:hidden">Copy</span>
              </button>
              <button
                onClick={handleExport}
                disabled={!canExport}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md sm:rounded-lg lg:rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Results</span>
                <span className="sm:hidden">Export</span>
                {user && user.subscription_tier === 'free' && (
                  <span className="text-xs opacity-75 hidden lg:inline">
                    ({5 - (user.monthly_exports_used || 0)} left)
                  </span>
                )}
                {user && user.subscription_tier === 'pro' && (
                  <span className="text-xs opacity-75 hidden lg:inline">
                    ({200 - (user.monthly_exports_used || 0)} left)
                  </span>
                )}
                {user && user.subscription_tier === 'premium' && (
                  <span className="text-xs opacity-75 hidden lg:inline">
                    (Unlimited)
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rewrite History Modal */}
      <RewriteHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onOpenPricing={onOpenPricing}
      />
    </div>
  );
}