// lib/messages.ts

import { ExtractedCodeBlock } from './code-detection';

// This is the source of truth for the client-side message structure.
// The backend will receive and store this entire object in a JSONB column.
export interface Message {
  id: string; // Unique UUID for each message
  role: 'user' | 'assistant' | 'system';
  
  // The user-visible text content of the message
  content: Array<{
    type: 'text';
    text?: string;
  }>;

  // For the AI's "chain of thought" output, parsed from <think> tags
  stepsMarkdown?: string;

  // For generated artifacts like code
  object?: {
    title: string;
    codeBlocks: ExtractedCodeBlock[];
  };

  // Optional fields for different message states
  type?: 'thinking';
  running?: boolean;
  model?: string; // The model used to generate this message
}