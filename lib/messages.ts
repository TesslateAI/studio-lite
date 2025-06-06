import { DeepPartial } from 'ai';
import { FragmentSchema } from './schema';
import { ExecutionResult } from './types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    image?: string;
  }>;
  object?: DeepPartial<FragmentSchema>;
  result?: ExecutionResult;
  type?: 'thinking';
  seconds?: number;
  stepsMarkdown?: string;
  running?: boolean;
  noBackground?: boolean;
}