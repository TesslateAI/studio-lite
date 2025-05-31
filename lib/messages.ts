export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    image?: string;
  }>;
  object?: any;
  result?: any;
  type?: 'thinking';
  seconds?: number;
  stepsMarkdown?: string;
  running?: boolean;
  noBackground?: boolean;
} 