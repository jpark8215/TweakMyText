import { WritingSample, RewriteResult, ToneSettings } from '../types';

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