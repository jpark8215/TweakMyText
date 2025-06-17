import { WritingSample, RewriteResult, ToneSettings, User } from '../types';
import { rewriteWithClaude } from './claudeApi';
import { 
  validateToneAccess, 
  validateToneSettings, 
  getAnalysisLevel, 
  getProcessingPriority,
  getSubscriptionLimits 
} from './subscriptionValidator';

// Secure version of analyzeToneFromSamples with subscription validation
export const analyzeToneFromSamples = (samples: WritingSample[], user: User | null): ToneSettings => {
  if (samples.length === 0) {
    return { formality: 50, casualness: 50, enthusiasm: 50, technicality: 50 };
  }

  const analysisLevel = getAnalysisLevel(user);
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const words = allText.split(/\s+/);
  
  // Basic analysis for all users
  let formality = 50;
  let casualness = 50;
  let enthusiasm = 50;
  let technicality = 50;

  // Basic tone detection
  const formalWords = ['however', 'furthermore', 'therefore', 'consequently'];
  const casualWords = ['gonna', 'wanna', 'kinda', 'yeah'];
  
  const formalCount = formalWords.reduce((count, word) => 
    count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  const casualCount = casualWords.reduce((count, word) => 
    count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  formality = Math.min(100, Math.max(0, 50 + (formalCount - casualCount) * 10));

  // Advanced analysis for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    try {
      validateToneAccess(user, 'advanced_analysis');
      
      // More sophisticated analysis
      const conversationalIndicators = ['i think', 'i believe', 'you know', 'honestly'];
      const conversationalCount = conversationalIndicators.reduce((count, phrase) => 
        count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
      
      casualness = Math.min(100, Math.max(0, 30 + conversationalCount * 15));
      
      const exclamationCount = (allText.match(/!/g) || []).length;
      const enthusiasticWords = ['amazing', 'awesome', 'fantastic', 'love'];
      const enthusiasticCount = enthusiasticWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      
      enthusiasm = Math.min(100, Math.max(0, 30 + exclamationCount * 8 + enthusiasticCount * 12));
      
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const longWords = words.filter(word => word.length > 8).length;
      
      technicality = Math.min(100, Math.max(0, 20 + (avgWordLength - 4) * 8 + longWords * 2));
    } catch (error) {
      console.warn('Advanced analysis not available for user subscription tier');
    }
  }

  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    try {
      validateToneAccess(user, 'extended_analysis');
      
      // Premium-only extended analysis features
      const technicalWords = ['implementation', 'methodology', 'optimization', 'architecture'];
      const technicalCount = technicalWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      
      technicality = Math.min(100, Math.max(technicality, technicality + technicalCount * 15));
      
      // Additional premium analysis features could be added here
    } catch (error) {
      console.warn('Extended analysis not available for user subscription tier');
    }
  }

  return {
    formality: Math.round(formality),
    casualness: Math.round(casualness),
    enthusiasm: Math.round(enthusiasm),
    technicality: Math.round(technicality)
  };
};

// Secure rewrite function with comprehensive validation
export const secureRewriteText = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  user: User | null
): Promise<RewriteResult> => {
  // Validate user subscription and tone settings
  validateToneSettings(user, toneSettings);
  
  const limits = getSubscriptionLimits(user);
  const analysisLevel = getAnalysisLevel(user);
  const processingPriority = getProcessingPriority(user);

  // Check if Claude API key is available
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
  
  if (apiKey) {
    try {
      // Validate priority processing access
      if (limits.hasPriorityProcessing) {
        validateToneAccess(user, 'priority_processing');
      }
      
      return await rewriteWithClaude(originalText, samples, toneSettings, apiKey, analysisLevel, processingPriority);
    } catch (error) {
      console.error('Claude API failed, falling back to mock:', error);
    }
  }

  // Fallback to secure mock implementation
  return await secureRewriteTextMock(originalText, samples, toneSettings, user, analysisLevel, processingPriority);
};

// Secure mock implementation with subscription-based features
const secureRewriteTextMock = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  user: User | null,
  analysisLevel: 'basic' | 'advanced' | 'extended',
  processingPriority: number
): Promise<RewriteResult> => {
  // Simulate processing time based on priority
  const processingDelay = processingPriority === 1 ? 800 : // Premium (3x faster)
                         processingPriority === 2 ? 1200 : // Pro (2x faster)
                         2000; // Free (standard speed)
  
  await new Promise(resolve => setTimeout(resolve, processingDelay));

  // Analyze style with subscription-appropriate level
  const styleTags = analyzeWritingStyleSecure(samples, analysisLevel);
  
  // Mock rewriting logic with subscription-based quality
  let rewritten = originalText;
  let confidence = 70; // Base confidence
  
  // Basic transformations for all users
  if (styleTags.includes('casual') && toneSettings.casualness > 60) {
    rewritten = rewritten
      .replace(/\bhowever\b/gi, 'but')
      .replace(/\btherefore\b/gi, 'so');
  }
  
  // Advanced transformations for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    confidence += 10; // Higher confidence with advanced analysis
    
    if (styleTags.includes('formal') && toneSettings.formality > 60) {
      rewritten = rewritten
        .replace(/\bbut\b/gi, 'however')
        .replace(/\bso\b/gi, 'therefore');
    }
  }
  
  // Extended transformations for Premium users only
  if (analysisLevel === 'extended') {
    confidence += 10; // Highest confidence with extended analysis
    
    if (styleTags.includes('enthusiastic') && toneSettings.enthusiasm > 70) {
      rewritten = rewritten.replace(/\./g, '!').replace(/!!/g, '!');
    }
    
    // Premium-only style improvements
    if (samples.some(s => s.content.includes('I think') || s.content.includes('I believe'))) {
      rewritten = rewritten.replace(/It is/g, 'I think it is');
    }
  }

  return {
    original: originalText,
    rewritten: rewritten,
    confidence: Math.min(100, confidence + Math.random() * 20),
    styleTags,
    timestamp: new Date()
  };
};

// Secure style analysis with subscription validation
const analyzeWritingStyleSecure = (samples: WritingSample[], analysisLevel: 'basic' | 'advanced' | 'extended'): string[] => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const tags: string[] = [];

  // Basic analysis for all users
  if (allText.includes('however') || allText.includes('furthermore')) {
    tags.push('formal');
  }
  if (allText.includes('gonna') || allText.includes('yeah')) {
    tags.push('casual');
  }

  // Advanced analysis for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (allText.split('!').length > 2) {
      tags.push('enthusiastic');
    }
    if (allText.includes('basically') || allText.includes('honestly')) {
      tags.push('conversational');
    }
  }

  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    if (allText.split(' ').some(word => word.length > 12)) {
      tags.push('technical');
    }
    if (allText.includes('love') || allText.includes('amazing')) {
      tags.push('positive');
    }
    // Additional premium-only style tags
    if (allText.includes('implementation') || allText.includes('methodology')) {
      tags.push('professional');
    }
  }

  return tags.length > 0 ? tags : ['neutral'];
};