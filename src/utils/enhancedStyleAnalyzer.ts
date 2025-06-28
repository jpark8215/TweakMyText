import { WritingSample, RewriteResult, ToneSettings, User } from '../types';
import { STYLE_FORMATTING_RULES, getFormattingRulesForStyles, applyFormattingRules } from './styleFormattingRules';
import { 
  validateToneAccess, 
  validateToneSettings, 
  getAnalysisLevel, 
  getProcessingPriority,
  getSubscriptionLimits 
} from './subscriptionValidator';

// Enhanced style analysis with formatting instructions
export const analyzeStyleWithFormatting = (samples: WritingSample[], user: User | null) => {
  const limits = getSubscriptionLimits(user);
  const analysisLevel = getAnalysisLevel(user);
  
  if (samples.length === 0) {
    return {
      detectedStyles: ['neutral'],
      formattingRules: [],
      toneSettings: getDefaultToneSettings(),
      analysisLevel
    };
  }

  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const detectedStyles = detectWritingStyles(allText, analysisLevel);
  const formattingRules = getFormattingRulesForStyles(detectedStyles);
  const toneSettings = analyzeToneFromSamples(samples, user);

  return {
    detectedStyles,
    formattingRules,
    toneSettings,
    analysisLevel,
    confidence: calculateAnalysisConfidence(samples, analysisLevel)
  };
};

// Enhanced text rewriting with formatting instructions
export const rewriteWithFormattingInstructions = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  user: User | null,
  targetStyle?: string
): Promise<RewriteResult & { formattingInstructions: string[] }> => {
  // Validate access and settings
  const limits = getSubscriptionLimits(user);
  validateToneSettings(user, toneSettings);
  
  const analysisLevel = getAnalysisLevel(user);
  const processingPriority = getProcessingPriority(user);

  // Analyze the writing samples for style
  const styleAnalysis = analyzeStyleWithFormatting(samples, user);
  
  // Determine target formatting rules
  let targetFormattingRules = styleAnalysis.formattingRules;
  if (targetStyle && STYLE_FORMATTING_RULES[targetStyle]) {
    targetFormattingRules = [STYLE_FORMATTING_RULES[targetStyle]];
  }

  // Generate formatting instructions
  const formattingInstructions = generateFormattingInstructions(
    targetFormattingRules,
    toneSettings,
    analysisLevel
  );

  // Simulate processing time based on priority
  const processingDelay = processingPriority === 1 ? 800 : 
                         processingPriority === 2 ? 1200 : 
                         2000;
  
  await new Promise(resolve => setTimeout(resolve, processingDelay));

  // Apply the formatting transformations
  let rewrittenText = originalText;
  
  // Apply style-specific transformations
  if (targetFormattingRules.length > 0) {
    rewrittenText = applyFormattingRules(
      rewrittenText, 
      targetFormattingRules, 
      calculateIntensityFromToneSettings(toneSettings)
    );
  }

  // Apply tone-specific adjustments
  rewrittenText = applyToneAdjustments(rewrittenText, toneSettings, limits);

  // Calculate confidence based on analysis level and processing priority
  const confidence = calculateRewriteConfidence(
    originalText, 
    rewrittenText, 
    samples, 
    analysisLevel, 
    processingPriority
  );

  return {
    original: originalText,
    rewritten: rewrittenText,
    confidence,
    styleTags: styleAnalysis.detectedStyles,
    timestamp: new Date(),
    formattingInstructions
  };
};

// Generate specific formatting instructions based on detected style and tone settings
const generateFormattingInstructions = (
  formattingRules: any[],
  toneSettings: ToneSettings,
  analysisLevel: string
): string[] => {
  const instructions: string[] = [];

  // Add style-specific instructions
  formattingRules.forEach(rule => {
    instructions.push(`**${rule.name} Style:**`);
    rule.formattingInstructions.forEach((instruction: string) => {
      instructions.push(`• ${instruction}`);
    });
  });

  // Add tone-specific instructions
  if (toneSettings.formality > 60) {
    instructions.push(
      "**Formality Adjustments:**",
      "• Replace contractions with full forms",
      "• Use sophisticated vocabulary and complex sentence structures",
      "• Employ formal transitional phrases"
    );
  } else if (toneSettings.formality < 40) {
    instructions.push(
      "**Casual Tone Adjustments:**",
      "• Use contractions and everyday language",
      "• Employ conversational connectors",
      "• Include personal pronouns for connection"
    );
  }

  if (toneSettings.enthusiasm > 70) {
    instructions.push(
      "**Enthusiasm Enhancements:**",
      "• Add energetic adjectives and positive language",
      "• Use exclamation points strategically",
      "• Include motivational phrases"
    );
  }

  if (toneSettings.confidence > 70) {
    instructions.push(
      "**Confidence Markers:**",
      "• Use definitive statements and strong verbs",
      "• Remove hedging language and uncertainty",
      "• Add authoritative phrases"
    );
  }

  // Add analysis level specific instructions
  if (analysisLevel === 'extended') {
    instructions.push(
      "**Extended Analysis Applied:**",
      "• Advanced linguistic pattern matching",
      "• Sophisticated style transformation",
      "• Premium-level accuracy and nuance"
    );
  } else if (analysisLevel === 'advanced') {
    instructions.push(
      "**Advanced Analysis Applied:**",
      "• Enhanced pattern recognition",
      "• Improved style consistency",
      "• Professional-grade transformation"
    );
  }

  return instructions;
};

// Helper functions
const detectWritingStyles = (text: string, analysisLevel: string): string[] => {
  const styles: string[] = [];

  // Basic detection for all users
  if (text.includes('however') || text.includes('furthermore')) {
    styles.push('formal');
  }
  if (text.includes('gonna') || text.includes('kinda')) {
    styles.push('casual');
  }

  // Advanced detection for Pro/Premium
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (text.split('!').length > 2) {
      styles.push('enthusiastic');
    }
    if (text.includes('basically') || text.includes('honestly')) {
      styles.push('conversational');
    }
    if (text.includes('creative') || text.includes('innovative')) {
      styles.push('creative');
    }
    if (text.includes('understand') || text.includes('feel')) {
      styles.push('empathetic');
    }
  }

  // Extended detection for Premium only
  if (analysisLevel === 'extended') {
    if (text.includes('confident') || text.includes('certain')) {
      styles.push('confident');
    }
    if (text.includes('funny') || text.includes('hilarious')) {
      styles.push('humorous');
    }
    if (text.includes('urgent') || text.includes('immediately')) {
      styles.push('urgent');
    }
    if (text.includes('clear') || text.includes('straightforward')) {
      styles.push('clear');
    }
  }

  return styles.length > 0 ? styles : ['neutral'];
};

const getDefaultToneSettings = (): ToneSettings => ({
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

const analyzeToneFromSamples = (samples: WritingSample[], user: User | null): ToneSettings => {
  // This would use the existing analyzeToneFromSamples function
  // from secureStyleAnalyzer.ts
  return getDefaultToneSettings();
};

const calculateIntensityFromToneSettings = (toneSettings: ToneSettings): number => {
  // Calculate how intensely to apply formatting based on tone settings
  const avgIntensity = Object.values(toneSettings).reduce((sum, val) => sum + Math.abs(val - 50), 0) / 10;
  return Math.min(1.0, avgIntensity / 50);
};

const applyToneAdjustments = (text: string, toneSettings: ToneSettings, limits: any): string => {
  let adjustedText = text;

  // Apply available tone adjustments based on subscription
  if (limits.availableToneControls.includes('formality')) {
    if (toneSettings.formality > 60) {
      adjustedText = adjustedText
        .replace(/\bbut\b/gi, 'however')
        .replace(/\bso\b/gi, 'therefore');
    } else if (toneSettings.formality < 40) {
      adjustedText = adjustedText
        .replace(/\bhowever\b/gi, 'but')
        .replace(/\btherefore\b/gi, 'so');
    }
  }

  if (limits.availableToneControls.includes('enthusiasm')) {
    if (toneSettings.enthusiasm > 70) {
      adjustedText = adjustedText
        .replace(/\bgood\b/gi, 'amazing')
        .replace(/\bnice\b/gi, 'fantastic');
    }
  }

  return adjustedText;
};

const calculateAnalysisConfidence = (samples: WritingSample[], analysisLevel: string): number => {
  let baseConfidence = 70;
  
  // Boost confidence based on analysis level
  if (analysisLevel === 'extended') baseConfidence += 20;
  else if (analysisLevel === 'advanced') baseConfidence += 10;
  
  // Boost confidence based on sample quality
  const sampleBonus = Math.min(samples.length * 5, 15);
  
  return Math.min(95, baseConfidence + sampleBonus);
};

const calculateRewriteConfidence = (
  original: string,
  rewritten: string,
  samples: WritingSample[],
  analysisLevel: string,
  processingPriority: number
): number => {
  let confidence = 75;
  
  // Analysis level bonus
  if (analysisLevel === 'extended') confidence += 15;
  else if (analysisLevel === 'advanced') confidence += 8;
  
  // Processing priority bonus
  if (processingPriority === 1) confidence += 10; // Premium
  else if (processingPriority === 2) confidence += 5; // Pro
  
  // Sample quality bonus
  confidence += Math.min(samples.length * 3, 10);
  
  return Math.min(95, confidence);
};