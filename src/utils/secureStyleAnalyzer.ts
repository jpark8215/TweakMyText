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

  // Basic tone detection for core controls
  const formalWords = ['however', 'furthermore', 'therefore', 'consequently'];
  const casualWords = ['gonna', 'wanna', 'kinda', 'yeah'];
  
  const formalCount = formalWords.reduce((count, word) => 
    count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  const casualCount = casualWords.reduce((count, word) => 
    count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  toneSettings.formality = Math.min(100, Math.max(0, 50 + (formalCount - casualCount) * 10));

  // Advanced analysis for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    try {
      validateToneAccess(user, 'advanced_analysis');
      
      // More sophisticated analysis for Pro tier controls
      const conversationalIndicators = ['i think', 'i believe', 'you know', 'honestly'];
      const conversationalCount = conversationalIndicators.reduce((count, phrase) => 
        count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
      
      toneSettings.casualness = Math.min(100, Math.max(0, 30 + conversationalCount * 15));
      
      const exclamationCount = (allText.match(/!/g) || []).length;
      const enthusiasticWords = ['amazing', 'awesome', 'fantastic', 'love'];
      const enthusiasticCount = enthusiasticWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      
      toneSettings.enthusiasm = Math.min(100, Math.max(0, 30 + exclamationCount * 8 + enthusiasticCount * 12));
      
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const longWords = words.filter(word => word.length > 8).length;
      
      toneSettings.technicality = Math.min(100, Math.max(0, 20 + (avgWordLength - 4) * 8 + longWords * 2));

      // Pro tier additional controls
      const creativeWords = ['innovative', 'unique', 'creative', 'original'];
      const creativeCount = creativeWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.creativity = Math.min(100, Math.max(0, 40 + creativeCount * 15));

      const empathyWords = ['understand', 'feel', 'empathize', 'appreciate'];
      const empathyCount = empathyWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.empathy = Math.min(100, Math.max(0, 40 + empathyCount * 12));

    } catch (error) {
      console.warn('Advanced analysis not available for user subscription tier');
    }
  }

  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    try {
      validateToneAccess(user, 'extended_analysis');
      
      // Premium-only extended analysis features
      const confidenceWords = ['confident', 'certain', 'sure', 'definitely'];
      const confidenceCount = confidenceWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.confidence = Math.min(100, Math.max(0, 45 + confidenceCount * 15));

      const humorWords = ['funny', 'hilarious', 'joke', 'laugh'];
      const humorCount = humorWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.humor = Math.min(100, Math.max(0, 30 + humorCount * 20));

      const urgencyWords = ['urgent', 'immediately', 'asap', 'quickly'];
      const urgencyCount = urgencyWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.urgency = Math.min(100, Math.max(0, 35 + urgencyCount * 18));

      const clarityWords = ['clear', 'obvious', 'simple', 'straightforward'];
      const clarityCount = clarityWords.reduce((count, word) => 
        count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      toneSettings.clarity = Math.min(100, Math.max(0, 50 + clarityCount * 12));

    } catch (error) {
      console.warn('Extended analysis not available for user subscription tier');
    }
  }

  // Round all values
  Object.keys(toneSettings).forEach(key => {
    toneSettings[key as keyof ToneSettings] = Math.round(toneSettings[key as keyof ToneSettings]);
  });

  return toneSettings;
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

  // Fallback to secure mock implementation
  return await secureRewriteTextMock(originalText, samples, filteredToneSettings, user, analysisLevel, processingPriority);
};

// Enhanced mock implementation with varied and realistic rewrites
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
  
  // Enhanced mock rewriting logic with varied transformations
  let rewritten = originalText;
  let confidence = 70; // Base confidence
  
  // Create a transformation context based on samples and tone settings
  const transformationContext = createTransformationContext(samples, toneSettings, styleTags);
  
  // Apply comprehensive transformations
  rewritten = applyAdvancedTransformations(rewritten, transformationContext, analysisLevel);
  
  // Calculate dynamic confidence based on transformations applied
  confidence = calculateDynamicConfidence(originalText, rewritten, transformationContext, analysisLevel, processingPriority);

  return {
    original: originalText,
    rewritten: rewritten,
    confidence: Math.min(100, confidence),
    styleTags,
    timestamp: new Date()
  };
};

// Create transformation context from samples and settings
const createTransformationContext = (samples: WritingSample[], toneSettings: ToneSettings, styleTags: string[]) => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  
  return {
    // Vocabulary preferences from samples
    prefersFormalWords: allText.includes('however') || allText.includes('furthermore'),
    prefersCasualWords: allText.includes('gonna') || allText.includes('kinda'),
    usesContractions: allText.includes("don't") || allText.includes("can't"),
    usesFirstPerson: allText.includes('i ') || allText.includes('my '),
    
    // Sentence structure patterns
    avgSentenceLength: calculateAvgSentenceLength(allText),
    usesQuestions: allText.includes('?'),
    usesExclamations: allText.includes('!'),
    
    // Tone preferences
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
    
    // Style tags
    styleTags
  };
};

// Calculate average sentence length from text
const calculateAvgSentenceLength = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const totalWords = text.split(/\s+/).length;
  return sentences.length > 0 ? totalWords / sentences.length : 10;
};

// Apply comprehensive transformations based on context
const applyAdvancedTransformations = (text: string, context: any, analysisLevel: string): string => {
  let transformed = text;
  
  // 1. Formality transformations
  if (context.formality > 60) {
    transformed = applyFormalTransformations(transformed);
  } else if (context.formality < 40) {
    transformed = applyCasualTransformations(transformed);
  }
  
  // 2. Enthusiasm transformations
  if (context.enthusiasm > 70) {
    transformed = applyEnthusiasticTransformations(transformed);
  } else if (context.enthusiasm < 30) {
    transformed = applyReservedTransformations(transformed);
  }
  
  // 3. Confidence transformations
  if (context.confidence > 70) {
    transformed = applyConfidentTransformations(transformed);
  } else if (context.confidence < 30) {
    transformed = applyTentativeTransformations(transformed);
  }
  
  // 4. Clarity transformations
  if (context.clarity > 70) {
    transformed = applyClarityTransformations(transformed);
  }
  
  // 5. Creativity transformations (Pro/Premium)
  if (analysisLevel !== 'basic' && context.creativity > 60) {
    transformed = applyCreativeTransformations(transformed);
  }
  
  // 6. Empathy transformations (Pro/Premium)
  if (analysisLevel !== 'basic' && context.empathy > 60) {
    transformed = applyEmpathyTransformations(transformed);
  }
  
  // 7. Humor transformations (Premium only)
  if (analysisLevel === 'extended' && context.humor > 60) {
    transformed = applyHumorTransformations(transformed);
  }
  
  // 8. Urgency transformations (Premium only)
  if (analysisLevel === 'extended' && context.urgency > 70) {
    transformed = applyUrgencyTransformations(transformed);
  }
  
  // 9. Technical transformations
  if (context.technicality > 60) {
    transformed = applyTechnicalTransformations(transformed);
  } else if (context.technicality < 40) {
    transformed = applySimpleTransformations(transformed);
  }
  
  // 10. Style-based transformations
  if (context.styleTags.includes('conversational')) {
    transformed = applyConversationalTransformations(transformed);
  }
  
  if (context.styleTags.includes('professional')) {
    transformed = applyProfessionalTransformations(transformed);
  }
  
  return transformed;
};

// Formal transformations
const applyFormalTransformations = (text: string): string => {
  return text
    .replace(/\bbut\b/gi, 'however')
    .replace(/\bso\b/gi, 'therefore')
    .replace(/\balso\b/gi, 'furthermore')
    .replace(/\bcan't\b/gi, 'cannot')
    .replace(/\bdon't\b/gi, 'do not')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bthat's\b/gi, 'that is')
    .replace(/\bI think\b/gi, 'I believe')
    .replace(/\bkind of\b/gi, 'somewhat')
    .replace(/\ba lot of\b/gi, 'numerous')
    .replace(/\bget\b/gi, 'obtain')
    .replace(/\bshow\b/gi, 'demonstrate');
};

// Casual transformations
const applyCasualTransformations = (text: string): string => {
  return text
    .replace(/\bhowever\b/gi, 'but')
    .replace(/\btherefore\b/gi, 'so')
    .replace(/\bfurthermore\b/gi, 'also')
    .replace(/\bcannot\b/gi, "can't")
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bwill not\b/gi, "won't")
    .replace(/\bit is\b/gi, "it's")
    .replace(/\bthat is\b/gi, "that's")
    .replace(/\bI believe\b/gi, 'I think')
    .replace(/\bsomewhat\b/gi, 'kind of')
    .replace(/\bnumerous\b/gi, 'a lot of')
    .replace(/\bobtain\b/gi, 'get')
    .replace(/\bdemonstrate\b/gi, 'show');
};

// Enthusiastic transformations
const applyEnthusiasticTransformations = (text: string): string => {
  return text
    .replace(/\bgood\b/gi, 'amazing')
    .replace(/\bnice\b/gi, 'fantastic')
    .replace(/\bokay\b/gi, 'great')
    .replace(/\bfine\b/gi, 'excellent')
    .replace(/\binteresting\b/gi, 'fascinating')
    .replace(/\./g, '!')
    .replace(/!!/g, '!')
    .replace(/\bI like\b/gi, 'I love')
    .replace(/\bpretty good\b/gi, 'absolutely wonderful');
};

// Reserved transformations
const applyReservedTransformations = (text: string): string => {
  return text
    .replace(/!/g, '.')
    .replace(/\bamazing\b/gi, 'adequate')
    .replace(/\bfantastic\b/gi, 'satisfactory')
    .replace(/\bexcellent\b/gi, 'acceptable')
    .replace(/\blove\b/gi, 'appreciate')
    .replace(/\bincredible\b/gi, 'notable');
};

// Confident transformations
const applyConfidentTransformations = (text: string): string => {
  return text
    .replace(/\bI think\b/gi, 'I know')
    .replace(/\bmight\b/gi, 'will')
    .replace(/\bcould\b/gi, 'can')
    .replace(/\bprobably\b/gi, 'definitely')
    .replace(/\bmaybe\b/gi, 'certainly')
    .replace(/\bperhaps\b/gi, 'undoubtedly')
    .replace(/\bI believe\b/gi, 'I am confident that')
    .replace(/\bseems like\b/gi, 'is clearly');
};

// Tentative transformations
const applyTentativeTransformations = (text: string): string => {
  return text
    .replace(/\bwill\b/gi, 'might')
    .replace(/\bcan\b/gi, 'could')
    .replace(/\bdefinitely\b/gi, 'probably')
    .replace(/\bcertainly\b/gi, 'perhaps')
    .replace(/\bis\b/gi, 'seems to be')
    .replace(/\bI know\b/gi, 'I think');
};

// Clarity transformations
const applyClarityTransformations = (text: string): string => {
  return text
    .replace(/\bcomplex\b/gi, 'straightforward')
    .replace(/\bcomplicated\b/gi, 'simple')
    .replace(/\bdifficult\b/gi, 'clear')
    .replace(/\bconfusing\b/gi, 'easy to understand')
    .replace(/\bin other words\b/gi, 'simply put')
    .replace(/\bthat is to say\b/gi, 'in simple terms');
};

// Creative transformations
const applyCreativeTransformations = (text: string): string => {
  return text
    .replace(/\bgood\b/gi, 'innovative')
    .replace(/\bnew\b/gi, 'groundbreaking')
    .replace(/\bdifferent\b/gi, 'unique')
    .replace(/\bchange\b/gi, 'transform')
    .replace(/\bimprove\b/gi, 'revolutionize')
    .replace(/\bway\b/gi, 'approach')
    .replace(/\bmethod\b/gi, 'creative solution');
};

// Empathy transformations
const applyEmpathyTransformations = (text: string): string => {
  return text
    .replace(/\bI think\b/gi, 'I understand that')
    .replace(/\byou should\b/gi, 'you might consider')
    .replace(/\byou need to\b/gi, 'it would be helpful if you')
    .replace(/\bthe problem is\b/gi, 'I can see how challenging it is that')
    .replace(/\byou have to\b/gi, 'I appreciate that you need to')
    .replace(/\bit's wrong\b/gi, 'I can understand your concern about');
};

// Humor transformations (light touches)
const applyHumorTransformations = (text: string): string => {
  return text
    .replace(/\binteresting\b/gi, 'amusing')
    .replace(/\bstrange\b/gi, 'quirky')
    .replace(/\bweird\b/gi, 'delightfully odd')
    .replace(/\bserious\b/gi, 'no-nonsense (well, mostly)')
    .replace(/\bobviously\b/gi, 'as clear as mud... just kidding, obviously');
};

// Urgency transformations
const applyUrgencyTransformations = (text: string): string => {
  return text
    .replace(/\bsoon\b/gi, 'immediately')
    .replace(/\blater\b/gi, 'right away')
    .replace(/\beventually\b/gi, 'urgently')
    .replace(/\bwhen you can\b/gi, 'as soon as possible')
    .replace(/\bif you have time\b/gi, 'this requires immediate attention')
    .replace(/\bplease consider\b/gi, 'please prioritize');
};

// Technical transformations
const applyTechnicalTransformations = (text: string): string => {
  return text
    .replace(/\bway\b/gi, 'methodology')
    .replace(/\bmethod\b/gi, 'systematic approach')
    .replace(/\bprocess\b/gi, 'procedural framework')
    .replace(/\bsystem\b/gi, 'infrastructure')
    .replace(/\bsetup\b/gi, 'configuration')
    .replace(/\bfix\b/gi, 'optimize')
    .replace(/\bproblem\b/gi, 'technical challenge');
};

// Simple transformations
const applySimpleTransformations = (text: string): string => {
  return text
    .replace(/\bmethodology\b/gi, 'way')
    .replace(/\bsystematic approach\b/gi, 'method')
    .replace(/\bprocedural framework\b/gi, 'process')
    .replace(/\binfrastructure\b/gi, 'system')
    .replace(/\bconfiguration\b/gi, 'setup')
    .replace(/\boptimize\b/gi, 'fix')
    .replace(/\btechnical challenge\b/gi, 'problem');
};

// Conversational transformations
const applyConversationalTransformations = (text: string): string => {
  return text
    .replace(/\bIn conclusion\b/gi, 'So basically')
    .replace(/\bTo summarize\b/gi, 'Long story short')
    .replace(/\bIt is important to note\b/gi, 'By the way')
    .replace(/\bOne must consider\b/gi, 'You should think about')
    .replace(/\bIt should be mentioned\b/gi, 'Oh, and');
};

// Professional transformations
const applyProfessionalTransformations = (text: string): string => {
  return text
    .replace(/\bSo basically\b/gi, 'In summary')
    .replace(/\bLong story short\b/gi, 'To conclude')
    .replace(/\bBy the way\b/gi, 'Additionally')
    .replace(/\bYou should think about\b/gi, 'It is advisable to consider')
    .replace(/\bOh, and\b/gi, 'Furthermore');
};

// Calculate dynamic confidence based on transformations
const calculateDynamicConfidence = (
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
  
  // Factor in style tag quality
  const styleTagBonus = Math.min(context.styleTags.length * 3, 15);
  confidence += styleTagBonus;
  
  // Add some realistic variance
  const variance = (Math.random() - 0.5) * 20; // ±10 points
  confidence += variance;
  
  return Math.max(65, Math.min(95, confidence)); // Keep within realistic bounds
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
    if (allText.includes('creative') || allText.includes('innovative')) {
      tags.push('creative');
    }
    if (allText.includes('understand') || allText.includes('feel')) {
      tags.push('empathetic');
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
    if (allText.includes('confident') || allText.includes('certain')) {
      tags.push('confident');
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
  }

  return tags.length > 0 ? tags : ['neutral'];
};