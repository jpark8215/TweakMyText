import { WritingSample, RewriteResult, ToneSettings } from '../types';

// Analyze writing samples to determine tone characteristics
export const analyzeToneFromSamples = (samples: WritingSample[]): ToneSettings => {
  if (samples.length === 0) {
    return { formality: 50, casualness: 50, enthusiasm: 50, technicality: 50 };
  }

  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const words = allText.split(/\s+/);
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Analyze formality (0-100, higher = more formal)
  const formalWords = ['however', 'furthermore', 'therefore', 'consequently', 'nevertheless', 'moreover', 'thus', 'hence', 'accordingly', 'subsequently'];
  const casualWords = ['gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nah', 'ok', 'cool', 'awesome', 'stuff'];
  
  const formalCount = formalWords.reduce((count, word) => count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  const casualCount = casualWords.reduce((count, word) => count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  const formality = Math.min(100, Math.max(0, 50 + (formalCount - casualCount) * 10));

  // Analyze conversational tone (0-100, higher = more conversational)
  const conversationalIndicators = ['i think', 'i believe', 'you know', 'honestly', 'basically', 'literally', 'actually', 'really'];
  const conversationalCount = conversationalIndicators.reduce((count, phrase) => count + (allText.match(new RegExp(phrase, 'g')) || []).length, 0);
  const questionCount = (allText.match(/\?/g) || []).length;
  
  const casualness = Math.min(100, Math.max(0, 30 + conversationalCount * 15 + questionCount * 10));

  // Analyze enthusiasm (0-100, higher = more enthusiastic)
  const exclamationCount = (allText.match(/!/g) || []).length;
  const enthusiasticWords = ['amazing', 'awesome', 'fantastic', 'incredible', 'wonderful', 'brilliant', 'excellent', 'perfect', 'love', 'excited'];
  const enthusiasticCount = enthusiasticWords.reduce((count, word) => count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  const enthusiasm = Math.min(100, Math.max(0, 30 + exclamationCount * 8 + enthusiasticCount * 12));

  // Analyze technical complexity (0-100, higher = more technical)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const longWords = words.filter(word => word.length > 8).length;
  const technicalWords = ['implementation', 'methodology', 'optimization', 'configuration', 'architecture', 'infrastructure', 'algorithm', 'framework', 'protocol', 'specification'];
  const technicalCount = technicalWords.reduce((count, word) => count + (allText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  
  const technicality = Math.min(100, Math.max(0, 20 + (avgWordLength - 4) * 8 + longWords * 2 + technicalCount * 15));

  return {
    formality: Math.round(formality),
    casualness: Math.round(casualness),
    enthusiasm: Math.round(enthusiasm),
    technicality: Math.round(technicality)
  };
};

// Mock LLM integration - in production, this would call your AI service
export const analyzeWritingStyle = (samples: WritingSample[]): string[] => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const tags: string[] = [];

  // Simple heuristics for demo - replace with actual AI analysis
  if (allText.includes('however') || allText.includes('furthermore') || allText.includes('moreover')) {
    tags.push('formal');
  }
  if (allText.includes('gonna') || allText.includes('kinda') || allText.includes('yeah')) {
    tags.push('casual');
  }
  if (allText.split('!').length > 2) {
    tags.push('enthusiastic');
  }
  if (allText.includes('basically') || allText.includes('honestly') || allText.includes('literally')) {
    tags.push('conversational');
  }
  if (allText.split(' ').some(word => word.length > 12)) {
    tags.push('technical');
  }
  if (allText.includes('love') || allText.includes('amazing') || allText.includes('wonderful')) {
    tags.push('positive');
  }

  return tags.length > 0 ? tags : ['neutral'];
};

export const rewriteText = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings
): Promise<RewriteResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const styleTags = analyzeWritingStyle(samples);
  
  // Mock rewriting logic - in production, this would use actual LLM
  let rewritten = originalText;
  
  // Apply style transformations based on samples and tone settings
  if (styleTags.includes('casual') && toneSettings.casualness > 60) {
    rewritten = rewritten
      .replace(/\bhowever\b/gi, 'but')
      .replace(/\btherefore\b/gi, 'so')
      .replace(/\bfurthermore\b/gi, 'also');
  }
  
  if (styleTags.includes('formal') && toneSettings.formality > 60) {
    rewritten = rewritten
      .replace(/\bbut\b/gi, 'however')
      .replace(/\bso\b/gi, 'therefore')
      .replace(/\balso\b/gi, 'furthermore');
  }
  
  if (styleTags.includes('enthusiastic') && toneSettings.enthusiasm > 70) {
    rewritten = rewritten.replace(/\./g, '!').replace(/!!/g, '!');
  }
  
  // Add some style-specific modifications
  if (samples.some(s => s.content.includes('I think') || s.content.includes('I believe'))) {
    rewritten = rewritten.replace(/It is/g, 'I think it is');
  }

  return {
    original: originalText,
    rewritten: rewritten,
    confidence: Math.random() * 30 + 70, // 70-100%
    styleTags,
    timestamp: new Date()
  };
};