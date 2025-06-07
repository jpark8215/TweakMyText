export interface WritingSample {
  id: string;
  content: string;
  title: string;
  createdAt: Date;
}

export interface WritingProfile {
  id: string;
  name: string;
  samples: WritingSample[];
  styleTags: string[];
  createdAt: Date;
  lastUsed: Date;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  confidence: number;
  styleTags: string[];
  timestamp: Date;
}

export interface ToneSettings {
  formality: number; // 0-100
  casualness: number; // 0-100
  enthusiasm: number; // 0-100
  technicality: number; // 0-100
}