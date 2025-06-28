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
    return { 
      formality: 50, casualness: 50, enthusiasm: 50, technicality: 50,
      creativity: 50, empathy: 50, confidence: 50, humor: 50, urgency: 50, clarity: 50
    };
  }

  const limits = getSubscriptionLimits(user);
  const analysisLevel = getAnalysisLevel(user);
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const words = allText.split(/\s+/);
  
  // Initialize all tone settings to default
  let toneSettings: ToneSettings = {
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
  };

  // Enhanced tone detection with more sophisticated analysis
  const analysisResult = performAdvancedStyleAnalysis(allText, words, analysisLevel);
  
  // Apply analysis results to tone settings
  Object.keys(analysisResult).forEach(key => {
    if (limits.availableToneControls.includes(key) || !limits.canModifyTone) {
      toneSettings[key as keyof ToneSettings] = Math.round(analysisResult[key]);
    }
  });

  return toneSettings;
};

// Enhanced style analysis function
const performAdvancedStyleAnalysis = (allText: string, words: string[], analysisLevel: string) => {
  const analysis = {
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
  };

  // Enhanced formality detection
  const formalIndicators = {
    words: ['however', 'furthermore', 'therefore', 'consequently', 'nevertheless', 'moreover', 'thus', 'hence', 'accordingly', 'subsequently'],
    phrases: ['in conclusion', 'it is important to note', 'one must consider', 'it should be mentioned', 'with regard to'],
    structures: /\b(shall|ought to|it is imperative|it is essential)\b/g
  };

  const casualIndicators = {
    words: ['gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nah', 'ok', 'cool', 'awesome', 'stuff'],
    contractions: /\b(don't|can't|won't|it's|that's|we're|they're|i'm)\b/g,
    phrases: ['by the way', 'long story short', 'so basically', 'you know what']
  };

  // Calculate formality score
  let formalScore = 0;
  let casualScore = 0;

  formalIndicators.words.forEach(word => {
    formalScore += (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length * 2;
  });

  formalIndicators.phrases.forEach(phrase => {
    formalScore += (allText.match(new RegExp(phrase, 'g')) || []).length * 3;
  });

  casualIndicators.words.forEach(word => {
    casualScore += (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length * 2;
  });

  const contractionMatches = allText.match(casualIndicators.contractions) || [];
  casualScore += contractionMatches.length;

  analysis.formality = Math.min(100, Math.max(0, 50 + (formalScore - casualScore) * 5));
  analysis.casualness = Math.min(100, Math.max(0, 50 + (casualScore - formalScore) * 5));

  // Enhanced enthusiasm detection
  const exclamationCount = (allText.match(/!/g) || []).length;
  const enthusiasticWords = ['amazing', 'awesome', 'fantastic', 'incredible', 'wonderful', 'brilliant', 'excellent', 'perfect', 'love', 'excited'];
  const enthusiasticCount = enthusiasticWords.reduce((count, word) => 
    count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  analysis.enthusiasm = Math.min(100, Math.max(0, 30 + exclamationCount * 8 + enthusiasticCount * 12));

  // Enhanced technical analysis
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const longWords = words.filter(word => word.length > 8).length;
  const technicalTerms = ['implementation', 'methodology', 'optimization', 'configuration', 'architecture', 'infrastructure', 'algorithm', 'framework', 'protocol', 'specification'];
  const technicalCount = technicalTerms.reduce((count, term) => 
    count + (allText.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length, 0);
  
  analysis.technicality = Math.min(100, Math.max(0, 20 + (avgWordLength - 4) * 8 + longWords * 2 + technicalCount * 15));

  // Advanced analysis for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    // Creativity analysis
    const creativeWords = ['innovative', 'unique', 'creative', 'original', 'imaginative', 'inventive', 'novel', 'groundbreaking'];
    const creativeCount = creativeWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    analysis.creativity = Math.min(100, Math.max(0, 40 + creativeCount * 15));

    // Empathy analysis
    const empathyWords = ['understand', 'feel', 'empathize', 'appreciate', 'recognize', 'acknowledge', 'sympathize'];
    const empathyPhrases = ['i can see', 'i understand that', 'it must be', 'i imagine'];
    const empathyCount = empathyWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const empathyPhraseCount = empathyPhrases.reduce((count, phrase) => 
      count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
    analysis.empathy = Math.min(100, Math.max(0, 40 + empathyCount * 12 + empathyPhraseCount * 20));
  }

  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    // Confidence analysis
    const confidenceWords = ['confident', 'certain', 'sure', 'definitely', 'absolutely', 'undoubtedly', 'clearly', 'obviously'];
    const tentativeWords = ['maybe', 'perhaps', 'possibly', 'might', 'could', 'seems', 'appears'];
    const confidenceCount = confidenceWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const tentativeCount = tentativeWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    analysis.confidence = Math.min(100, Math.max(0, 50 + (confidenceCount - tentativeCount) * 10));

    // Humor analysis
    const humorWords = ['funny', 'hilarious', 'joke', 'laugh', 'amusing', 'witty', 'clever'];
    const humorPhrases = ['just kidding', 'haha', 'lol', 'ironically'];
    const humorCount = humorWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const humorPhraseCount = humorPhrases.reduce((count, phrase) => 
      count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
    analysis.humor = Math.min(100, Math.max(0, 30 + humorCount * 20 + humorPhraseCount * 15));

    // Urgency analysis
    const urgencyWords = ['urgent', 'immediately', 'asap', 'quickly', 'now', 'deadline', 'critical', 'priority'];
    const urgencyPhrases = ['as soon as possible', 'time sensitive', 'right away'];
    const urgencyCount = urgencyWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const urgencyPhraseCount = urgencyPhrases.reduce((count, phrase) => 
      count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
    analysis.urgency = Math.min(100, Math.max(0, 35 + urgencyCount * 18 + urgencyPhraseCount * 25));

    // Clarity analysis
    const clarityWords = ['clear', 'obvious', 'simple', 'straightforward', 'plain', 'direct', 'transparent'];
    const complexityWords = ['complex', 'complicated', 'intricate', 'convoluted', 'elaborate'];
    const clarityCount = clarityWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const complexityCount = complexityWords.reduce((count, word) => 
      count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    analysis.clarity = Math.min(100, Math.max(0, 50 + (clarityCount - complexityCount) * 12));
  }

  return analysis;
};

// Secure rewrite function with comprehensive validation
export const secureRewriteText = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  user: User | null
): Promise<RewriteResult> => {
  // Create a filtered tone settings object that only includes available controls
  const limits = getSubscriptionLimits(user);
  const filteredToneSettings: ToneSettings = {
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
  };

  // Only include tone settings for controls available to the user's tier
  Object.keys(toneSettings).forEach(key => {
    if (limits.availableToneControls.includes(key) || !limits.canModifyTone) {
      filteredToneSettings[key as keyof ToneSettings] = toneSettings[key as keyof ToneSettings];
    }
    // For unavailable controls, keep default value (50)
  });

  // Validate the filtered tone settings
  validateToneSettings(user, filteredToneSettings);
  
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
      
      return await rewriteWithClaude(originalText, samples, filteredToneSettings, apiKey, analysisLevel, processingPriority);
    } catch (error) {
      console.error('Claude API failed, falling back to mock:', error);
    }
  }

  // Fallback to enhanced mock implementation
  return await secureRewriteTextMock(originalText, samples, filteredToneSettings, user, analysisLevel, processingPriority);
};

// Enhanced mock implementation with comprehensive transformations
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
  
  // Enhanced mock rewriting logic with comprehensive transformations
  let rewritten = originalText;
  let confidence = 70; // Base confidence
  
  // Create a comprehensive transformation context
  const transformationContext = createEnhancedTransformationContext(samples, toneSettings, styleTags, analysisLevel);
  
  // Apply comprehensive transformations in logical order
  rewritten = applyComprehensiveTransformations(rewritten, transformationContext, analysisLevel);
  
  // Calculate dynamic confidence based on transformations applied
  confidence = calculateEnhancedConfidence(originalText, rewritten, transformationContext, analysisLevel, processingPriority);

  return {
    original: originalText,
    rewritten: rewritten,
    confidence: Math.min(100, confidence),
    styleTags,
    timestamp: new Date()
  };
};

// Enhanced transformation context creation
const createEnhancedTransformationContext = (samples: WritingSample[], toneSettings: ToneSettings, styleTags: string[], analysisLevel: string) => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = allText.split(/\s+/);
  
  return {
    // Enhanced vocabulary preferences
    prefersFormalWords: allText.includes('however') || allText.includes('furthermore') || allText.includes('therefore'),
    prefersCasualWords: allText.includes('gonna') || allText.includes('kinda') || allText.includes('yeah'),
    usesContractions: (allText.match(/\b(don't|can't|won't|it's|that's)\b/g) || []).length > 0,
    usesFirstPerson: allText.includes('i ') || allText.includes('my ') || allText.includes('me '),
    usesSecondPerson: allText.includes('you ') || allText.includes('your '),
    
    // Enhanced sentence structure patterns
    avgSentenceLength: calculateAvgSentenceLength(allText),
    usesQuestions: allText.includes('?'),
    usesExclamations: allText.includes('!'),
    usesLongSentences: sentences.some(s => s.split(' ').length > 20),
    usesShortSentences: sentences.some(s => s.split(' ').length < 8),
    
    // Enhanced punctuation patterns
    exclamationFrequency: (allText.match(/!/g) || []).length / sentences.length,
    questionFrequency: (allText.match(/\?/g) || []).length / sentences.length,
    commaFrequency: (allText.match(/,/g) || []).length / words.length,
    
    // Tone preferences with intensity
    formality: toneSettings.formality,
    casualness: toneSettings.casualness,
    enthusiasm: toneSettings.enthusiasm,
    technicality: toneSettings.technicality,
    creativity: toneSettings.creativity,
    empathy: toneSettings.empathy,
    confidence: toneSettings.confidence,
    humor: toneSettings.humor,
    urgency: toneSettings.urgency,
    clarity: toneSettings.clarity,
    
    // Enhanced style tags with context
    styleTags,
    analysisLevel,
    
    // Writing patterns
    vocabularyComplexity: calculateVocabularyComplexity(words),
    sentenceVariety: calculateSentenceVariety(sentences),
    emotionalTone: detectEmotionalTone(allText),
    
    // Professional vs personal indicators
    isProfessional: styleTags.includes('professional') || styleTags.includes('formal'),
    isPersonal: styleTags.includes('conversational') || styleTags.includes('casual'),
    
    // Technical writing indicators
    usesTechnicalTerms: styleTags.includes('technical'),
    usesJargon: detectJargonUsage(allText),
    
    // Creative writing indicators
    usesMetaphors: detectMetaphorUsage(allText),
    usesDescriptiveLanguage: detectDescriptiveLanguage(allText)
  };
};

// Enhanced comprehensive transformations
const applyComprehensiveTransformations = (text: string, context: any, analysisLevel: string): string => {
  let transformed = text;
  
  // Phase 1: Core tone transformations (available to all tiers)
  if (context.formality > 60) {
    transformed = applyEnhancedFormalTransformations(transformed, context);
  } else if (context.formality < 40) {
    transformed = applyEnhancedCasualTransformations(transformed, context);
  }
  
  if (context.enthusiasm > 70) {
    transformed = applyEnhancedEnthusiasticTransformations(transformed, context);
  } else if (context.enthusiasm < 30) {
    transformed = applyEnhancedReservedTransformations(transformed, context);
  }
  
  // Phase 2: Advanced transformations (Pro/Premium)
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (context.confidence > 70) {
      transformed = applyEnhancedConfidentTransformations(transformed, context);
    } else if (context.confidence < 30) {
      transformed = applyEnhancedTentativeTransformations(transformed, context);
    }
    
    if (context.clarity > 70) {
      transformed = applyEnhancedClarityTransformations(transformed, context);
    }
    
    if (context.creativity > 60) {
      transformed = applyEnhancedCreativeTransformations(transformed, context);
    }
    
    if (context.empathy > 60) {
      transformed = applyEnhancedEmpathyTransformations(transformed, context);
    }
  }
  
  // Phase 3: Premium-only transformations
  if (analysisLevel === 'extended') {
    if (context.humor > 60) {
      transformed = applyEnhancedHumorTransformations(transformed, context);
    }
    
    if (context.urgency > 70) {
      transformed = applyEnhancedUrgencyTransformations(transformed, context);
    }
  }
  
  // Phase 4: Technical complexity adjustments
  if (context.technicality > 60) {
    transformed = applyEnhancedTechnicalTransformations(transformed, context);
  } else if (context.technicality < 40) {
    transformed = applyEnhancedSimpleTransformations(transformed, context);
  }
  
  // Phase 5: Style-based transformations
  if (context.styleTags.includes('conversational')) {
    transformed = applyEnhancedConversationalTransformations(transformed, context);
  }
  
  if (context.styleTags.includes('professional')) {
    transformed = applyEnhancedProfessionalTransformations(transformed, context);
  }
  
  // Phase 6: Sentence structure adjustments
  if (context.usesShortSentences && context.avgSentenceLength < 10) {
    transformed = maintainShortSentences(transformed);
  } else if (context.usesLongSentences && context.avgSentenceLength > 15) {
    transformed = createLongerSentences(transformed);
  }
  
  // Phase 7: Punctuation style matching
  transformed = adjustPunctuationStyle(transformed, context);
  
  return transformed;
};

// Enhanced formal transformations with context awareness
const applyEnhancedFormalTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  // Basic formal replacements
  const formalReplacements = [
    [/\bbut\b/gi, 'however'],
    [/\bso\b/gi, 'therefore'],
    [/\balso\b/gi, 'furthermore'],
    [/\bcan't\b/gi, 'cannot'],
    [/\bdon't\b/gi, 'do not'],
    [/\bwon't\b/gi, 'will not'],
    [/\bit's\b/gi, 'it is'],
    [/\bthat's\b/gi, 'that is'],
    [/\bI think\b/gi, 'I believe'],
    [/\bkind of\b/gi, 'somewhat'],
    [/\ba lot of\b/gi, 'numerous'],
    [/\bget\b/gi, 'obtain'],
    [/\bshow\b/gi, 'demonstrate'],
    [/\bmake\b/gi, 'create'],
    [/\buse\b/gi, 'utilize'],
    [/\bhelp\b/gi, 'assist'],
    [/\bstart\b/gi, 'commence'],
    [/\bend\b/gi, 'conclude']
  ];
  
  formalReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  // Context-aware formal enhancements
  if (context.isProfessional) {
    transformed = transformed
      .replace(/\bI want\b/gi, 'I would like')
      .replace(/\bI need\b/gi, 'I require')
      .replace(/\blet me know\b/gi, 'please inform me');
  }
  
  return transformed;
};

// Enhanced casual transformations with context awareness
const applyEnhancedCasualTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  // Basic casual replacements
  const casualReplacements = [
    [/\bhowever\b/gi, 'but'],
    [/\btherefore\b/gi, 'so'],
    [/\bfurthermore\b/gi, 'also'],
    [/\bcannot\b/gi, "can't"],
    [/\bdo not\b/gi, "don't"],
    [/\bwill not\b/gi, "won't"],
    [/\bit is\b/gi, "it's"],
    [/\bthat is\b/gi, "that's"],
    [/\bI believe\b/gi, 'I think'],
    [/\bsomewhat\b/gi, 'kind of'],
    [/\bnumerous\b/gi, 'a lot of'],
    [/\bobtain\b/gi, 'get'],
    [/\bdemonstrate\b/gi, 'show'],
    [/\butilize\b/gi, 'use'],
    [/\bassist\b/gi, 'help'],
    [/\bcommence\b/gi, 'start'],
    [/\bconclude\b/gi, 'end']
  ];
  
  casualReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  // Context-aware casual enhancements
  if (context.isPersonal) {
    transformed = transformed
      .replace(/\bI would like\b/gi, 'I want')
      .replace(/\bI require\b/gi, 'I need')
      .replace(/\bplease inform me\b/gi, 'let me know');
  }
  
  return transformed;
};

// Enhanced enthusiastic transformations
const applyEnhancedEnthusiasticTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const enthusiasticReplacements = [
    [/\bgood\b/gi, 'amazing'],
    [/\bnice\b/gi, 'fantastic'],
    [/\bokay\b/gi, 'great'],
    [/\bfine\b/gi, 'excellent'],
    [/\binteresting\b/gi, 'fascinating'],
    [/\bI like\b/gi, 'I love'],
    [/\bpretty good\b/gi, 'absolutely wonderful'],
    [/\bworks\b/gi, 'works perfectly'],
    [/\bhelpful\b/gi, 'incredibly helpful']
  ];
  
  enthusiasticReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  // Add exclamation marks strategically
  if (context.exclamationFrequency > 0.1) {
    transformed = transformed.replace(/\./g, (match, offset, string) => {
      // Don't replace periods in abbreviations or numbers
      const beforePeriod = string.charAt(offset - 1);
      const afterPeriod = string.charAt(offset + 1);
      
      if (beforePeriod.match(/[A-Z]/) && afterPeriod.match(/[A-Z]/)) return match; // Abbreviation
      if (beforePeriod.match(/\d/) && afterPeriod.match(/\d/)) return match; // Number
      
      // Replace some periods with exclamation marks
      return Math.random() < 0.3 ? '!' : match;
    });
  }
  
  return transformed;
};

// Enhanced reserved transformations
const applyEnhancedReservedTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const reservedReplacements = [
    [/!/g, '.'],
    [/\bamazing\b/gi, 'adequate'],
    [/\bfantastic\b/gi, 'satisfactory'],
    [/\bexcellent\b/gi, 'acceptable'],
    [/\blove\b/gi, 'appreciate'],
    [/\bincredible\b/gi, 'notable'],
    [/\bawesome\b/gi, 'decent'],
    [/\bperfect\b/gi, 'suitable']
  ];
  
  reservedReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced confident transformations
const applyEnhancedConfidentTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const confidentReplacements = [
    [/\bI think\b/gi, 'I know'],
    [/\bmight\b/gi, 'will'],
    [/\bcould\b/gi, 'can'],
    [/\bprobably\b/gi, 'definitely'],
    [/\bmaybe\b/gi, 'certainly'],
    [/\bperhaps\b/gi, 'undoubtedly'],
    [/\bI believe\b/gi, 'I am confident that'],
    [/\bseems like\b/gi, 'is clearly'],
    [/\bappears to be\b/gi, 'is'],
    [/\bmay be\b/gi, 'is'],
    [/\bshould work\b/gi, 'will work'],
    [/\btry to\b/gi, 'will']
  ];
  
  confidentReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced tentative transformations
const applyEnhancedTentativeTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const tentativeReplacements = [
    [/\bwill\b/gi, 'might'],
    [/\bcan\b/gi, 'could'],
    [/\bdefinitely\b/gi, 'probably'],
    [/\bcertainly\b/gi, 'perhaps'],
    [/\bis\b/gi, 'seems to be'],
    [/\bI know\b/gi, 'I think'],
    [/\bwill work\b/gi, 'should work'],
    [/\bwill help\b/gi, 'might help']
  ];
  
  tentativeReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced clarity transformations
const applyEnhancedClarityTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const clarityReplacements = [
    [/\bcomplex\b/gi, 'straightforward'],
    [/\bcomplicated\b/gi, 'simple'],
    [/\bdifficult\b/gi, 'clear'],
    [/\bconfusing\b/gi, 'easy to understand'],
    [/\bin other words\b/gi, 'simply put'],
    [/\bthat is to say\b/gi, 'in simple terms'],
    [/\bconvoluted\b/gi, 'direct'],
    [/\belaborate\b/gi, 'basic'],
    [/\bintricate\b/gi, 'simple']
  ];
  
  clarityReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced creative transformations
const applyEnhancedCreativeTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const creativeReplacements = [
    [/\bgood\b/gi, 'innovative'],
    [/\bnew\b/gi, 'groundbreaking'],
    [/\bdifferent\b/gi, 'unique'],
    [/\bchange\b/gi, 'transform'],
    [/\bimprove\b/gi, 'revolutionize'],
    [/\bway\b/gi, 'approach'],
    [/\bmethod\b/gi, 'creative solution'],
    [/\bidea\b/gi, 'vision'],
    [/\bplan\b/gi, 'strategy'],
    [/\bsolution\b/gi, 'breakthrough']
  ];
  
  creativeReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced empathy transformations
const applyEnhancedEmpathyTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const empathyReplacements = [
    [/\bI think\b/gi, 'I understand that'],
    [/\byou should\b/gi, 'you might consider'],
    [/\byou need to\b/gi, 'it would be helpful if you'],
    [/\bthe problem is\b/gi, 'I can see how challenging it is that'],
    [/\byou have to\b/gi, 'I appreciate that you need to'],
    [/\bit's wrong\b/gi, 'I can understand your concern about'],
    [/\byou must\b/gi, 'I imagine you feel you should'],
    [/\bthat's bad\b/gi, 'that sounds difficult']
  ];
  
  empathyReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced humor transformations
const applyEnhancedHumorTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const humorReplacements = [
    [/\binteresting\b/gi, 'amusing'],
    [/\bstrange\b/gi, 'quirky'],
    [/\bweird\b/gi, 'delightfully odd'],
    [/\bserious\b/gi, 'no-nonsense (well, mostly)'],
    [/\bobviously\b/gi, 'as clear as mud... just kidding, obviously'],
    [/\bproblem\b/gi, 'little hiccup'],
    [/\berror\b/gi, 'oops moment']
  ];
  
  humorReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced urgency transformations
const applyEnhancedUrgencyTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const urgencyReplacements = [
    [/\bsoon\b/gi, 'immediately'],
    [/\blater\b/gi, 'right away'],
    [/\beventually\b/gi, 'urgently'],
    [/\bwhen you can\b/gi, 'as soon as possible'],
    [/\bif you have time\b/gi, 'this requires immediate attention'],
    [/\bplease consider\b/gi, 'please prioritize'],
    [/\bwhen convenient\b/gi, 'at your earliest opportunity'],
    [/\bsometime\b/gi, 'immediately']
  ];
  
  urgencyReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced technical transformations
const applyEnhancedTechnicalTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const technicalReplacements = [
    [/\bway\b/gi, 'methodology'],
    [/\bmethod\b/gi, 'systematic approach'],
    [/\bprocess\b/gi, 'procedural framework'],
    [/\bsystem\b/gi, 'infrastructure'],
    [/\bsetup\b/gi, 'configuration'],
    [/\bfix\b/gi, 'optimize'],
    [/\bproblem\b/gi, 'technical challenge'],
    [/\bchange\b/gi, 'modification'],
    [/\bupdate\b/gi, 'enhancement'],
    [/\bcheck\b/gi, 'validate']
  ];
  
  technicalReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced simple transformations
const applyEnhancedSimpleTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const simpleReplacements = [
    [/\bmethodology\b/gi, 'way'],
    [/\bsystematic approach\b/gi, 'method'],
    [/\bprocedural framework\b/gi, 'process'],
    [/\binfrastructure\b/gi, 'system'],
    [/\bconfiguration\b/gi, 'setup'],
    [/\boptimize\b/gi, 'fix'],
    [/\btechnical challenge\b/gi, 'problem'],
    [/\bmodification\b/gi, 'change'],
    [/\benhancement\b/gi, 'update'],
    [/\bvalidate\b/gi, 'check']
  ];
  
  simpleReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced conversational transformations
const applyEnhancedConversationalTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const conversationalReplacements = [
    [/\bIn conclusion\b/gi, 'So basically'],
    [/\bTo summarize\b/gi, 'Long story short'],
    [/\bIt is important to note\b/gi, 'By the way'],
    [/\bOne must consider\b/gi, 'You should think about'],
    [/\bIt should be mentioned\b/gi, 'Oh, and'],
    [/\bFurthermore\b/gi, 'Plus'],
    [/\bHowever\b/gi, 'But'],
    [/\bTherefore\b/gi, 'So']
  ];
  
  conversationalReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Enhanced professional transformations
const applyEnhancedProfessionalTransformations = (text: string, context: any): string => {
  let transformed = text;
  
  const professionalReplacements = [
    [/\bSo basically\b/gi, 'In summary'],
    [/\bLong story short\b/gi, 'To conclude'],
    [/\bBy the way\b/gi, 'Additionally'],
    [/\bYou should think about\b/gi, 'It is advisable to consider'],
    [/\bOh, and\b/gi, 'Furthermore'],
    [/\bPlus\b/gi, 'Additionally'],
    [/\bBut\b/gi, 'However'],
    [/\bSo\b/gi, 'Therefore']
  ];
  
  professionalReplacements.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement);
  });
  
  return transformed;
};

// Helper functions for enhanced analysis
const calculateAvgSentenceLength = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const totalWords = text.split(/\s+/).length;
  return sentences.length > 0 ? totalWords / sentences.length : 10;
};

const calculateVocabularyComplexity = (words: string[]): number => {
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const longWords = words.filter(word => word.length > 8).length;
  return avgWordLength + (longWords / words.length) * 10;
};

const calculateSentenceVariety = (sentences: string[]): number => {
  const lengths = sentences.map(s => s.split(' ').length);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  return Math.sqrt(variance);
};

const detectEmotionalTone = (text: string): string => {
  const positiveWords = ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great'];
  const negativeWords = ['sad', 'angry', 'hate', 'terrible', 'awful', 'bad'];
  
  const positiveCount = positiveWords.reduce((count, word) => 
    count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  const negativeCount = negativeWords.reduce((count, word) => 
    count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

const detectJargonUsage = (text: string): boolean => {
  const jargonTerms = ['synergy', 'leverage', 'paradigm', 'disrupt', 'scalable', 'ecosystem'];
  return jargonTerms.some(term => text.includes(term));
};

const detectMetaphorUsage = (text: string): boolean => {
  const metaphorIndicators = ['like a', 'as if', 'reminds me of', 'similar to'];
  return metaphorIndicators.some(indicator => text.includes(indicator));
};

const detectDescriptiveLanguage = (text: string): boolean => {
  const descriptiveWords = ['beautiful', 'elegant', 'sophisticated', 'vibrant', 'stunning'];
  return descriptiveWords.some(word => text.includes(word));
};

// Enhanced sentence structure adjustments
const maintainShortSentences = (text: string): string => {
  return text.replace(/([.!?])\s+([A-Z])/g, (match, punct, letter) => {
    // Keep sentences short by avoiding complex conjunctions
    return `${punct} ${letter}`;
  });
};

const createLongerSentences = (text: string): string => {
  return text.replace(/([.!?])\s+([A-Z])/g, (match, punct, letter, offset, string) => {
    // Occasionally combine sentences with conjunctions
    if (Math.random() < 0.3) {
      const conjunctions = [', and ', ', but ', ', so ', ', which '];
      const conjunction = conjunctions[Math.floor(Math.random() * conjunctions.length)];
      return `${conjunction}${letter.toLowerCase()}`;
    }
    return match;
  });
};

// Enhanced punctuation style matching
const adjustPunctuationStyle = (text: string, context: any): string => {
  let adjusted = text;
  
  // Match exclamation frequency
  if (context.exclamationFrequency > 0.2) {
    adjusted = adjusted.replace(/\./g, (match, offset, string) => {
      return Math.random() < context.exclamationFrequency ? '!' : match;
    });
  }
  
  // Match question frequency
  if (context.questionFrequency > 0.1) {
    adjusted = adjusted.replace(/\./g, (match, offset, string) => {
      const beforePeriod = string.substring(Math.max(0, offset - 20), offset);
      if (beforePeriod.includes('how') || beforePeriod.includes('what') || beforePeriod.includes('why')) {
        return Math.random() < context.questionFrequency ? '?' : match;
      }
      return match;
    });
  }
  
  return adjusted;
};

// Enhanced confidence calculation
const calculateEnhancedConfidence = (
  original: string, 
  rewritten: string, 
  context: any,
  analysisLevel: string,
  processingPriority: number
): number => {
  let confidence = 60; // Base confidence
  
  // Factor in analysis level
  if (analysisLevel === 'extended') confidence += 20;
  else if (analysisLevel === 'advanced') confidence += 10;
  
  // Factor in processing priority
  if (processingPriority === 1) confidence += 15; // Premium
  else if (processingPriority === 2) confidence += 8; // Pro
  
  // Factor in text transformation amount
  const originalWords = original.split(' ').length;
  const rewrittenWords = rewritten.split(' ').length;
  const lengthSimilarity = 1 - Math.abs(originalWords - rewrittenWords) / Math.max(originalWords, rewrittenWords);
  confidence += lengthSimilarity * 10;
  
  // Factor in style tag quality and context richness
  const styleTagBonus = Math.min(context.styleTags.length * 3, 15);
  confidence += styleTagBonus;
  
  // Factor in transformation complexity
  const transformationComplexity = calculateTransformationComplexity(original, rewritten);
  confidence += transformationComplexity * 5;
  
  // Add realistic variance based on context
  const contextVariance = context.vocabularyComplexity > 6 ? 5 : -5;
  confidence += contextVariance;
  
  return Math.max(65, Math.min(95, confidence)); // Keep within realistic bounds
};

const calculateTransformationComplexity = (original: string, rewritten: string): number => {
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const rewrittenWords = new Set(rewritten.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...originalWords].filter(x => rewrittenWords.has(x)));
  const union = new Set([...originalWords, ...rewrittenWords]);
  
  // Jaccard similarity - lower means more transformation
  const similarity = intersection.size / union.size;
  return 1 - similarity; // Higher complexity for more transformation
};

// Enhanced secure style analysis with comprehensive detection
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
    if (allText.includes('creative') || allText.includes('innovative')) {
      tags.push('creative');
    }
    if (allText.includes('understand') || allText.includes('feel')) {
      tags.push('empathetic');
    }
    if (allText.includes('confident') || allText.includes('certain')) {
      tags.push('confident');
    }
    if (allText.includes('technical') || allText.includes('implementation')) {
      tags.push('technical');
    }
  }

  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    if (allText.split(' ').some(word => word.length > 12)) {
      tags.push('sophisticated');
    }
    if (allText.includes('love') || allText.includes('amazing')) {
      tags.push('positive');
    }
    if (allText.includes('implementation') || allText.includes('methodology')) {
      tags.push('professional');
    }
    if (allText.includes('funny') || allText.includes('hilarious')) {
      tags.push('humorous');
    }
    if (allText.includes('urgent') || allText.includes('immediately')) {
      tags.push('urgent');
    }
    if (allText.includes('clear') || allText.includes('straightforward')) {
      tags.push('clear');
    }
    if (detectMetaphorUsage(allText)) {
      tags.push('metaphorical');
    }
    if (detectDescriptiveLanguage(allText)) {
      tags.push('descriptive');
    }
  }

  return tags.length > 0 ? tags : ['neutral'];
};