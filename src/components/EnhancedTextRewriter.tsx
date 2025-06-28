import React, { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, Sliders, Copy, Download, RefreshCw, ArrowLeft, Zap, AlertCircle, Calendar, Clock, Crown, Star, CheckCircle, History, Palette } from 'lucide-react';
import { WritingSample, RewriteResult, ToneSettings } from '../types';
import { rewriteWithFormattingInstructions, analyzeStyleWithFormatting } from '../utils/enhancedStyleAnalyzer';
import { validateToneAccess, validatePresetAccess, getSubscriptionLimits } from '../utils/subscriptionValidator';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { createExportService } from '../services/exportService';
import ToneControls from './ToneControls';
import ComparisonView from './ComparisonView';
import RewriteHistoryStats from './RewriteHistoryStats';
import RewriteHistoryModal from './RewriteHistoryModal';
import StyleFormattingDisplay from './StyleFormattingDisplay';
import StylePresetSelector from './StylePresetSelector';
import { secureLog, handleError } from '../utils/errorHandler';

interface EnhancedTextRewriterProps {
  samples: WritingSample[];
  onBack: () => void;
  onOpenPricing?: () => void;
}

interface EnhancedRewriteResult extends RewriteResult {
  formattingInstructions: string[];
}

export default function EnhancedTextRewriter({ samples, onBack, onOpenPricing }: EnhancedTextRewriterProps) {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<EnhancedRewriteResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [showToneControls, setShowToneControls] = useState(false);
  const [showStylePresets, setShowStylePresets] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHistoryStats, setShowHistoryStats] = useState(false);
  const [showFormattingInstructions, setShowFormattingInstructions] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
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
  const [styleAnalysis, setStyleAnalysis] = useState<any>(null);

  const { user, updateTokens, updateExports, saveRewriteHistory } = useAuth();

  // Create export service instance
  const exportService = useMemo(() => createExportService(updateExports), [updateExports]);

  // Analyze samples and set initial tone settings when component mounts or samples change
  useEffect(() => {
    if (samples.length > 0) {
      try {
        const analysis = analyzeStyleWithFormatting(samples, user);
        setStyleAnalysis(analysis);
        setToneSettings(analysis.toneSettings);
      } catch (error) {
        const appError = handleError(error, 'style_analysis');
        secureLog('Style analysis limited by subscription tier:', { error: appError.message });
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
    return Math.ceil(text.length / 4);
  };

  const handleRewrite = async () => {
    if (!inputText.trim() || !user) return;
    
    setSecurityError(null);
    setRewriteSaveStatus(null);
    
    const estimatedTokens = estimateTokenUsage(inputText);
    
    // Token validation (same as before)
    if (user.tokens_remaining <= 0) {
      alert('You have no tokens remaining. Please wait for your daily reset or upgrade your plan.');
      return;
    }

    if (estimatedTokens > user.tokens_remaining) {
      alert(`This text requires approximately ${formatTokens(estimatedTokens)} tokens, but you only have ${formatTokens(user.tokens_remaining)} remaining.`);
      return;
    }

    if (user.subscription_tier === 'free' && user.daily_tokens_used >= 100000) {
      alert('You have reached your daily limit of 100,000 tokens. Tokens reset at midnight UTC.');
      return;
    }

    const monthlyLimit = limits.monthlyLimit;
    if (user.monthly_tokens_used >= monthlyLimit) {
      alert(`You have reached your monthly limit of ${formatTokens(monthlyLimit)} tokens. ${user.subscription_tier === 'free' ? 'Upgrade to Pro or Premium for more tokens.' : 'Limit resets on your signup anniversary.'}`);
      return;
    }
    
    setIsRewriting(true);
    try {
      // Perform enhanced rewrite with formatting instructions
      const rewriteResult = await rewriteWithFormattingInstructions(
        inputText, 
        samples, 
        toneSettings, 
        user,
        selectedStyle || undefined
      );
      
      setResult(rewriteResult);
      setShowFormattingInstructions(true);

      // Deduct tokens and save to database
      const { error: tokenError } = await updateTokens(estimatedTokens);
      
      if (tokenError) {
        alert(tokenError.message);
        return;
      }

      // Save rewrite history (only for Pro/Premium)
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
        } else {
          secureLog('Rewrite history saved successfully');
          setRewriteSaveStatus('saved');
          setStatsRefreshTrigger(prev => prev + 1);
          
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

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(selectedStyle === style ? null : style);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExport = async () => {
    if (!result || !user) return;
    
    try {
      const exportData = {
        original: result.original,
        rewritten: result.rewritten,
        confidence: result.confidence,
        styleTags: result.styleTags,
        formattingInstructions: result.formattingInstructions,
        selectedStyle: selectedStyle,
        toneSettings: toneSettings,
        timestamp: result.timestamp,
        samples: samples.map(s => ({ title: s.title, preview: s.content.substring(0, 100) + '...' })),
        tier: user.subscription_tier,
        analysisType: limits.hasExtendedAnalysis ? 'Extended' : limits.hasAdvancedAnalysis ? 'Advanced' : 'Basic',
        processingPriority: limits.hasPriorityProcessing ? (user.subscription_tier === 'premium' ? '3x Speed' : '2x Speed') : 'Standard',
        securityValidated: true,
        rewriteSaved: rewriteSaveStatus === 'saved',
      };
      
      const filename = `enhanced-rewrite-${new Date().toISOString().split('T')[0]}.json`;
      
      await exportService.exportData(exportData, filename, user);
      
      secureLog('Enhanced export completed successfully');
    } catch (error) {
      const appError = handleError(error, 'export_rewrite');
      secureLog('Export failed:', { error: appError.message });
      alert(appError.message);
    }
  };

  const canRewrite = user && user.tokens_remaining > 0 && inputText.trim() && 
    (user.subscription_tier !== 'free' || (user.daily_tokens_used < 100000 && user.monthly_tokens_used < 1000000)) &&
    user.monthly_tokens_used < limits.monthlyLimit;

  const hasHistoryAccess = user?.subscription_tier === 'pro' || user?.subscription_tier === 'premium';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
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
              Enhanced Style Rewriter
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">
              Transform text with detailed formatting instructions
              {limits.hasExtendedAnalysis && (
                <span className="block text-amber-600 text-sm mt-1 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" />
                  Extended Analysis with Formatting Rules
                </span>
              )}
            </p>
          </div>
          
          {/* Style Analysis Display */}
          {styleAnalysis && (
            <div className="mb-6 p-4 bg-white/80 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-800">Detected Styles:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {styleAnalysis.detectedStyles.map((style: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                  >
                    {style}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Confidence: {styleAnalysis.confidence}% • Analysis: {styleAnalysis.analysisLevel}
              </p>
            </div>
          )}
          
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
              </div>
            )}
            
            {/* Control Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowStylePresets(!showStylePresets)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all backdrop-blur-sm border border-gray-200 text-sm"
              >
                <Palette className="w-4 h-4" />
                <span>Style Presets</span>
                {limits.canUsePresets && (
                  <Crown className="w-3 h-3 text-amber-500" />
                )}
              </button>

              <button
                onClick={() => setShowToneControls(!showToneControls)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all backdrop-blur-sm border border-gray-200 text-sm"
              >
                <Sliders className="w-4 h-4" />
                <span>Tone Controls</span>
                {limits.canUsePresets && (
                  <Crown className="w-3 h-3 text-amber-500" />
                )}
              </button>

              <button
                onClick={() => setShowHistoryStats(!showHistoryStats)}
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

        {/* Rewrite Summary */}
        {showHistoryStats && (
          <div className="max-w-4xl mx-auto">
            <RewriteHistoryStats 
              onOpenPricing={onOpenPricing}
              refreshTrigger={statsRefreshTrigger}
            />
          </div>
        )}

        {/* Style Presets */}
        {showStylePresets && (
          <div className="max-w-6xl mx-auto mb-6">
            <StylePresetSelector
              selectedStyle={selectedStyle}
              onStyleSelect={handleStyleSelect}
              onOpenPricing={onOpenPricing}
            />
          </div>
        )}

        {/* Tone Controls */}
        {showToneControls && (
          <div className="max-w-6xl mx-auto mb-6">
            <ToneControls
              settings={toneSettings}
              onChange={handleToneSettingsChange}
              onClose={() => setShowToneControls(false)}
              onOpenPricing={onOpenPricing}
            />
          </div>
        )}

        {/* Security Error Alert */}
        {securityError && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium">Access Restricted</p>
                <p className="text-red-600 text-sm">{securityError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 p-6 shadow-lg mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Input Text</h3>
            {selectedStyle && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                <Palette className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">
                  {selectedStyle} style selected
                </span>
              </div>
            )}
          </div>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste the text you want to rewrite with enhanced formatting instructions..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none"
          />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{inputText.split(' ').filter(w => w.trim()).length} words</span>
              <span>~{formatTokens(estimateTokenUsage(inputText))} tokens</span>
            </div>
            <button
              onClick={handleRewrite}
              disabled={!canRewrite || isRewriting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing with Formatting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Rewrite with Instructions
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Formatting Instructions Display */}
            {showFormattingInstructions && result.formattingInstructions && (
              <StyleFormattingDisplay
                formattingInstructions={result.formattingInstructions}
                detectedStyles={result.styleTags}
                analysisLevel={limits.hasExtendedAnalysis ? 'extended' : limits.hasAdvancedAnalysis ? 'advanced' : 'basic'}
                confidence={result.confidence}
              />
            )}

            <ComparisonView result={result} />
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowFormattingInstructions(!showFormattingInstructions)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white/90 text-gray-700 rounded-lg transition-all border border-gray-200"
              >
                <FileText className="w-4 h-4" />
                {showFormattingInstructions ? 'Hide' : 'Show'} Formatting Rules
              </button>
              
              <button
                onClick={() => handleCopy(result.rewritten)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25"
              >
                <Copy className="w-4 h-4" />
                Copy Rewritten
              </button>
              
              <button
                onClick={handleExport}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                <Download className="w-4 h-4" />
                Export with Instructions
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