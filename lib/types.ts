export interface ExecutionResultWeb {
  url: string;
  id: string;
  status: 'success' | 'error';
}

export type ExecutionResult = ExecutionResultWeb;

export interface Model {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  envKey: string;
  apiBaseEnvKey?: string;
  apiKeyEnvKey?: string;
  access: 'free' | 'plus' | 'pro';
}