export interface ExecutionResultWeb {
  url: string;
  id: string;
  status: 'success' | 'error';
}

export type ExecutionResult = ExecutionResultWeb;
