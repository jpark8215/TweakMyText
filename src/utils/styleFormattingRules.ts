// Style formatting rules for different writing styles
export interface StyleFormattingRule {
  name: string;
  description: string;
  characteristics: string[];
  formattingInstructions: string[];
  examples: {
    before: string;
    after: string;
  };
}

export const STYLE_FORMATTING_RULES: Record<string, StyleFormattingRule> = {
  formal: {
    name: "Formal Professional",
    description: "Professional, authoritative, and structured communication",
    characteristics: [
      "Uses complete sentences and proper grammar",
      "Avoids contractions and colloquialisms", 
      "Employs sophisticated vocabulary",
      "Maintains objective tone"
    ],
    formattingInstructions: [
      "Replace contractions with full forms (don't → do not, can't → cannot)",
      "Use formal transitional phrases (however, furthermore, consequently)",
      "Employ passive voice where appropriate for objectivity",
      "Structure with clear topic sentences and supporting details",
      "Use precise, technical vocabulary when applicable",
      "Maintain consistent third-person perspective"
    ],
    examples: {
      before: "I think we should probably look into this issue soon.",
      after: "It is recommended that this matter be investigated promptly to ensure optimal outcomes."
    }
  },

  casual: {
    name: "Casual Conversational",
    description: "Friendly, approachable, and relatable communication",
    characteristics: [
      "Uses contractions and everyday language",
      "Includes personal pronouns and direct address",
      "Employs conversational connectors",
      "Maintains warm, approachable tone"
    ],
    formattingInstructions: [
      "Use contractions naturally (do not → don't, cannot → can't)",
      "Replace formal transitions with casual connectors (however → but, therefore → so)",
      "Include personal pronouns (I, you, we) for connection",
      "Use everyday vocabulary over technical terms",
      "Add conversational fillers and qualifiers (kind of, pretty much, I think)",
      "Structure as if speaking directly to the reader"
    ],
    examples: {
      before: "It is recommended that this matter be investigated promptly.",
      after: "I think we should probably check this out soon - it's pretty important."
    }
  },

  enthusiastic: {
    name: "Enthusiastic Energetic",
    description: "Excited, motivational, and high-energy communication",
    characteristics: [
      "Uses exclamation points strategically",
      "Employs positive, energetic vocabulary",
      "Includes motivational language",
      "Maintains upbeat, inspiring tone"
    ],
    formattingInstructions: [
      "Add exclamation points to emphasize excitement (but not excessively)",
      "Use energetic adjectives (amazing, fantastic, incredible, outstanding)",
      "Include motivational phrases (let's do this, you've got this, absolutely)",
      "Employ action-oriented language and strong verbs",
      "Add enthusiasm markers (wow, awesome, brilliant)",
      "Structure with building momentum and positive reinforcement"
    ],
    examples: {
      before: "This is a good opportunity for our team.",
      after: "This is an absolutely fantastic opportunity for our team! We're going to do amazing things with this!"
    }
  },

  technical: {
    name: "Technical Detailed",
    description: "Precise, methodical, and technically accurate communication",
    characteristics: [
      "Uses industry-specific terminology",
      "Includes detailed explanations",
      "Employs systematic structure",
      "Maintains analytical tone"
    ],
    formattingInstructions: [
      "Replace general terms with specific technical vocabulary",
      "Add detailed explanations and specifications",
      "Use systematic numbering or bullet points for processes",
      "Include precise measurements, data, or parameters",
      "Employ conditional and procedural language (if/then, when/then)",
      "Structure with logical flow and clear dependencies"
    ],
    examples: {
      before: "We need to fix the system problem.",
      after: "We must implement a systematic debugging protocol to identify and resolve the infrastructure bottleneck affecting system performance metrics."
    }
  },

  creative: {
    name: "Creative Imaginative",
    description: "Innovative, expressive, and artistically engaging communication",
    characteristics: [
      "Uses metaphors and analogies",
      "Employs varied sentence structures",
      "Includes vivid imagery",
      "Maintains imaginative tone"
    ],
    formattingInstructions: [
      "Incorporate metaphors and analogies for complex concepts",
      "Use varied sentence lengths for rhythm and flow",
      "Add sensory details and vivid imagery",
      "Employ creative word choices and unexpected combinations",
      "Include storytelling elements and narrative structure",
      "Structure with artistic flow rather than rigid logic"
    ],
    examples: {
      before: "The project is progressing well.",
      after: "Our project is blossoming like a garden in spring - each milestone a new flower blooming in the landscape of innovation."
    }
  },

  empathetic: {
    name: "Empathetic Understanding",
    description: "Compassionate, understanding, and emotionally aware communication",
    characteristics: [
      "Acknowledges feelings and perspectives",
      "Uses inclusive and supportive language",
      "Employs gentle, understanding tone",
      "Maintains emotional sensitivity"
    ],
    formattingInstructions: [
      "Acknowledge emotions and perspectives (I understand, I can see how)",
      "Use inclusive language (we, us, together)",
      "Add supportive phrases (you're not alone, that makes sense)",
      "Employ gentle qualifiers (perhaps, might, could)",
      "Include validation statements (that's completely understandable)",
      "Structure with emotional awareness and support"
    ],
    examples: {
      before: "You made an error in the report.",
      after: "I can see there might be a small discrepancy in the report - these things happen to all of us, and it's easily fixable together."
    }
  },

  confident: {
    name: "Confident Assertive",
    description: "Self-assured, decisive, and authoritative communication",
    characteristics: [
      "Uses definitive statements",
      "Employs strong, decisive language",
      "Avoids hedging and uncertainty",
      "Maintains authoritative tone"
    ],
    formattingInstructions: [
      "Replace uncertain language with definitive statements (might → will, could → can)",
      "Use strong, decisive verbs (determine, establish, achieve)",
      "Remove hedging words (maybe, perhaps, possibly)",
      "Add authoritative phrases (I'm confident that, without a doubt)",
      "Employ direct, clear statements without qualifiers",
      "Structure with clear assertions and strong conclusions"
    ],
    examples: {
      before: "I think this might work if we try it.",
      after: "This approach will deliver the results we need. I'm confident in its success."
    }
  },

  humorous: {
    name: "Humorous Playful",
    description: "Light-hearted, witty, and entertaining communication",
    characteristics: [
      "Includes appropriate humor and wit",
      "Uses playful language and wordplay",
      "Employs light-hearted observations",
      "Maintains entertaining tone"
    ],
    formattingInstructions: [
      "Add light-hearted observations and gentle humor",
      "Use playful language and occasional wordplay",
      "Include amusing analogies or comparisons",
      "Employ self-deprecating humor when appropriate",
      "Add witty asides or parenthetical comments",
      "Structure with comedic timing and surprise elements"
    ],
    examples: {
      before: "The meeting was long and covered many topics.",
      after: "The meeting was longer than a CVS receipt and covered more ground than a GPS with commitment issues."
    }
  },

  urgent: {
    name: "Urgent Time-Sensitive",
    description: "Time-critical, action-oriented, and immediate communication",
    characteristics: [
      "Emphasizes time sensitivity",
      "Uses action-oriented language",
      "Employs direct, concise structure",
      "Maintains sense of immediacy"
    ],
    formattingInstructions: [
      "Add time-sensitive language (immediately, urgent, ASAP, deadline)",
      "Use action verbs and imperative mood (act now, respond today)",
      "Employ short, punchy sentences for impact",
      "Include specific deadlines and timeframes",
      "Add urgency markers (important, critical, time-sensitive)",
      "Structure with immediate action items and clear next steps"
    ],
    examples: {
      before: "We should address this issue when convenient.",
      after: "URGENT: This critical issue requires immediate attention. Please respond by 5 PM today with your action plan."
    }
  },

  clear: {
    name: "Clear Straightforward",
    description: "Simple, direct, and easily understood communication",
    characteristics: [
      "Uses simple, direct language",
      "Employs clear structure and organization",
      "Avoids jargon and complexity",
      "Maintains accessible tone"
    ],
    formattingInstructions: [
      "Replace complex words with simple alternatives",
      "Use short, clear sentences with one main idea each",
      "Organize with bullet points or numbered lists",
      "Add clear headings and logical structure",
      "Remove unnecessary jargon and technical terms",
      "Structure with obvious flow and easy-to-follow logic"
    ],
    examples: {
      before: "We must implement a comprehensive methodology to optimize our operational efficiency.",
      after: "We need to find better ways to work. Here's what we'll do: 1) Review our current process 2) Find problems 3) Fix them."
    }
  }
};

// Function to get formatting rules for detected styles
export const getFormattingRulesForStyles = (styleTags: string[]): StyleFormattingRule[] => {
  return styleTags
    .map(tag => STYLE_FORMATTING_RULES[tag])
    .filter(rule => rule !== undefined);
};

// Function to get all available style rules
export const getAllStyleRules = (): StyleFormattingRule[] => {
  return Object.values(STYLE_FORMATTING_RULES);
};

// Function to apply formatting rules to text
export const applyFormattingRules = (
  text: string, 
  rules: StyleFormattingRule[], 
  intensity: number = 1.0
): string => {
  let formattedText = text;
  
  // Apply each rule's formatting instructions
  rules.forEach(rule => {
    // Apply transformations based on the rule's instructions
    // This is a simplified version - in production, you'd have more sophisticated NLP
    
    if (rule.name.includes('Formal')) {
      formattedText = applyFormalFormatting(formattedText, intensity);
    } else if (rule.name.includes('Casual')) {
      formattedText = applyCasualFormatting(formattedText, intensity);
    } else if (rule.name.includes('Enthusiastic')) {
      formattedText = applyEnthusiasticFormatting(formattedText, intensity);
    }
    // Add more rule applications as needed
  });
  
  return formattedText;
};

// Helper functions for specific formatting
const applyFormalFormatting = (text: string, intensity: number): string => {
  return text
    .replace(/\bdon't\b/gi, 'do not')
    .replace(/\bcan't\b/gi, 'cannot')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bthat's\b/gi, 'that is')
    .replace(/\bbut\b/gi, 'however')
    .replace(/\bso\b/gi, 'therefore');
};

const applyCasualFormatting = (text: string, intensity: number): string => {
  return text
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bcannot\b/gi, "can't")
    .replace(/\bwill not\b/gi, "won't")
    .replace(/\bit is\b/gi, "it's")
    .replace(/\bthat is\b/gi, "that's")
    .replace(/\bhowever\b/gi, 'but')
    .replace(/\btherefore\b/gi, 'so');
};

const applyEnthusiasticFormatting = (text: string, intensity: number): string => {
  return text
    .replace(/\bgood\b/gi, 'amazing')
    .replace(/\bnice\b/gi, 'fantastic')
    .replace(/\bokay\b/gi, 'great')
    .replace(/\./g, '!')
    .replace(/!!/g, '!');
};