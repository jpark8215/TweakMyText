import { WritingSample, RewriteResult, ToneSettings } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export const rewriteWithClaude = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  apiKey: string,
  analysisLevel: 'basic' | 'advanced' | 'extended' = 'basic',
  processingPriority: number = 3
): Promise<RewriteResult> => {
  const samplesText = samples
    .map((sample, index) => `Sample ${index + 1} - "${sample.title}":\n${sample.content}`)
    .join('\n\n---\n\n');

  const toneInstructions = generateToneInstructions(toneSettings, analysisLevel);
  const analysisInstructions = generateAnalysisInstructions(analysisLevel);

  const prompt = `You are a professional writing style matcher with ${analysisLevel} analysis capabilities. Your task is to rewrite text to match a specific person's writing style based on their samples.

WRITING SAMPLES TO LEARN FROM:
${samplesText}

ANALYSIS LEVEL: ${analysisLevel.toUpperCase()}
${analysisInstructions}

TONE ADJUSTMENTS:
${toneInstructions}

TASK: Rewrite the following text to match the writing style from the samples above, incorporating the tone adjustments and using ${analysisLevel} analysis:

ORIGINAL TEXT:
${originalText}

INSTRUCTIONS:
1. Analyze the writing samples for tone, vocabulary, sentence structure, and style patterns using ${analysisLevel} analysis
2. Apply the tone adjustments specified above
3. Rewrite the original text to match this style while preserving the core meaning
4. Maintain the same level of detail and information
5. Return ONLY the rewritten text, no explanations or additional commentary

REWRITTEN TEXT:`;

  try {
    // Simulate priority processing with different model parameters
    const modelConfig = getModelConfig(processingPriority, analysisLevel);
    
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();
    const rewrittenText = data.content[0]?.text || originalText;

    // Analyze style tags with subscription-appropriate level
    const styleTags = analyzeStyleTagsSecure(samples, analysisLevel);
    
    // Calculate confidence based on analysis level and processing priority
    const confidence = calculateConfidenceSecure(originalText, rewrittenText, samples, analysisLevel, processingPriority);

    return {
      original: originalText,
      rewritten: rewrittenText,
      confidence,
      styleTags,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to rewrite text. Please try again.');
  }
};

const getModelConfig = (processingPriority: number, analysisLevel: string) => {
  // Premium users get the best model configuration
  if (processingPriority === 1) {
    return {
      model: 'claude-3-sonnet-20240229',
      maxTokens: 1500,
      temperature: 0.3,
    };
  }
  
  // Pro users get enhanced configuration
  if (processingPriority === 2) {
    return {
      model: 'claude-3-sonnet-20240229',
      maxTokens: 1200,
      temperature: 0.4,
    };
  }
  
  // Free users get standard configuration
  return {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 1000,
    temperature: 0.5,
  };
};

const generateAnalysisInstructions = (analysisLevel: string): string => {
  switch (analysisLevel) {
    case 'extended':
      return `- Perform comprehensive linguistic analysis including syntax patterns, semantic structures, and stylistic nuances
- Analyze rhetorical devices, sentence complexity, and advanced vocabulary usage
- Consider contextual tone variations and sophisticated writing techniques
- Apply premium-level style matching with highest accuracy`;
    case 'advanced':
      return `- Perform detailed analysis of writing patterns, tone consistency, and vocabulary choices
- Analyze sentence structure variations and stylistic preferences
- Consider emotional undertones and professional vs. casual language usage`;
    default:
      return `- Perform basic analysis of writing tone and simple vocabulary patterns
- Focus on fundamental style elements like formality level and basic sentence structure`;
  }
};

const generateToneInstructions = (settings: ToneSettings, analysisLevel: string): string => {
  const instructions: string[] = [];

  // Basic tone instructions for all levels
  if (settings.formality > 60) {
    instructions.push(`- Use formal language and professional tone (${settings.formality}% formal)`);
  } else if (settings.formality < 40) {
    instructions.push(`- Use casual, informal language (${100 - settings.formality}% casual)`);
  }

  // Advanced tone instructions for Pro/Premium
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (settings.casualness > 60) {
      instructions.push(`- Be conversational and approachable (${settings.casualness}% conversational)`);
    }

    if (settings.enthusiasm > 60) {
      instructions.push(`- Show energy and enthusiasm (${settings.enthusiasm}% enthusiastic)`);
    } else if (settings.enthusiasm < 40) {
      instructions.push(`- Maintain a calm, measured tone (${100 - settings.enthusiasm}% reserved)`);
    }
  }

  // Extended tone instructions for Premium only
  if (analysisLevel === 'extended') {
    if (settings.technicality > 60) {
      instructions.push(`- Include technical details and precise language (${settings.technicality}% technical)`);
    } else if (settings.technicality < 40) {
      instructions.push(`- Keep explanations simple and accessible (${100 - settings.technicality}% simplified)`);
    }
  }

  return instructions.length > 0 ? instructions.join('\n') : '- Maintain a balanced, natural tone';
};

const analyzeStyleTagsSecure = (samples: WritingSample[], analysisLevel: string): string[] => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const tags: string[] = [];

  // Basic analysis for all users
  if (allText.includes('however') || allText.includes('furthermore')) {
    tags.push('formal');
  }
  if (allText.includes('gonna') || allText.includes('kinda')) {
    tags.push('casual');
  }

  // Advanced analysis for Pro/Premium
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (allText.split('!').length > 2) {
      tags.push('enthusiastic');
    }
    if (allText.includes('basically') || allText.includes('honestly')) {
      tags.push('conversational');
    }
    if (allText.includes('love') || allText.includes('amazing')) {
      tags.push('positive');
    }
  }

  // Extended analysis for Premium only
  if (analysisLevel === 'extended') {
    if (allText.split(' ').some(word => word.length > 12)) {
      tags.push('technical');
    }
    if (allText.includes('implementation') || allText.includes('methodology')) {
      tags.push('professional');
    }
    if (allText.includes('innovative') || allText.includes('cutting-edge')) {
      tags.push('forward-thinking');
    }
  }

  return tags.length > 0 ? tags : ['neutral'];
};

const calculateConfidenceSecure = (
  original: string, 
  rewritten: string, 
  samples: WritingSample[], 
  analysisLevel: string,
  processingPriority: number
): number => {
  // Base confidence calculation
  const originalWords = original.split(' ').length;
  const rewrittenWords = rewritten.split(' ').length;
  const lengthSimilarity = 1 - Math.abs(originalWords - rewrittenWords) / Math.max(originalWords, rewrittenWords);
  
  // Factor in sample quality
  const sampleQuality = Math.min(1, samples.length / 3) * 0.2;
  
  // Base confidence varies by analysis level
  let baseConfidence = 0.6; // Basic
  if (analysisLevel === 'advanced') baseConfidence = 0.75;
  if (analysisLevel === 'extended') baseConfidence = 0.85;
  
  // Processing priority bonus
  const priorityBonus = processingPriority === 1 ? 0.1 : // Premium
                       processingPriority === 2 ? 0.05 : // Pro
                       0; // Free
  
  return Math.round((baseConfidence + lengthSimilarity * 0.15 + sampleQuality + priorityBonus) * 100);
};