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
  apiKey: string
): Promise<RewriteResult> => {
  const samplesText = samples
    .map((sample, index) => `Sample ${index + 1} - "${sample.title}":\n${sample.content}`)
    .join('\n\n---\n\n');

  const toneInstructions = generateToneInstructions(toneSettings);

  const prompt = `You are a professional writing style matcher. Your task is to rewrite text to match a specific person's writing style based on their samples.

WRITING SAMPLES TO LEARN FROM:
${samplesText}

TONE ADJUSTMENTS:
${toneInstructions}

TASK: Rewrite the following text to match the writing style from the samples above, incorporating the tone adjustments:

ORIGINAL TEXT:
${originalText}

INSTRUCTIONS:
1. Analyze the writing samples for tone, vocabulary, sentence structure, and style patterns
2. Apply the tone adjustments specified above
3. Rewrite the original text to match this style while preserving the core meaning
4. Maintain the same level of detail and information
5. Return ONLY the rewritten text, no explanations or additional commentary

REWRITTEN TEXT:`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
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

    // Analyze style tags from samples
    const styleTags = analyzeStyleTags(samples);
    
    // Calculate confidence based on text similarity and style matching
    const confidence = calculateConfidence(originalText, rewrittenText, samples);

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

const generateToneInstructions = (settings: ToneSettings): string => {
  const instructions: string[] = [];

  if (settings.formality > 60) {
    instructions.push(`- Use formal language and professional tone (${settings.formality}% formal)`);
  } else if (settings.formality < 40) {
    instructions.push(`- Use casual, informal language (${100 - settings.formality}% casual)`);
  }

  if (settings.casualness > 60) {
    instructions.push(`- Be conversational and approachable (${settings.casualness}% conversational)`);
  }

  if (settings.enthusiasm > 60) {
    instructions.push(`- Show energy and enthusiasm (${settings.enthusiasm}% enthusiastic)`);
  } else if (settings.enthusiasm < 40) {
    instructions.push(`- Maintain a calm, measured tone (${100 - settings.enthusiasm}% reserved)`);
  }

  if (settings.technicality > 60) {
    instructions.push(`- Include technical details and precise language (${settings.technicality}% technical)`);
  } else if (settings.technicality < 40) {
    instructions.push(`- Keep explanations simple and accessible (${100 - settings.technicality}% simplified)`);
  }

  return instructions.length > 0 ? instructions.join('\n') : '- Maintain a balanced, natural tone';
};

const analyzeStyleTags = (samples: WritingSample[]): string[] => {
  const allText = samples.map(s => s.content).join(' ').toLowerCase();
  const tags: string[] = [];

  // Analyze writing patterns
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

const calculateConfidence = (original: string, rewritten: string, samples: WritingSample[]): number => {
  // Simple confidence calculation based on text transformation
  const originalWords = original.split(' ').length;
  const rewrittenWords = rewritten.split(' ').length;
  const lengthSimilarity = 1 - Math.abs(originalWords - rewrittenWords) / Math.max(originalWords, rewrittenWords);
  
  // Factor in sample quality
  const sampleQuality = Math.min(1, samples.length / 3) * 0.3;
  const baseConfidence = 0.7;
  
  return Math.round((baseConfidence + lengthSimilarity * 0.2 + sampleQuality) * 100);
};