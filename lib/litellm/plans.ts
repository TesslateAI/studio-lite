// lib/litellm/plans.ts

export type PlanName = 'free' | 'plus' | 'pro';

export interface PlanDetails {
  // The access group name that maps to model_info in your config.yaml
  models: string[]; 
  // Requests per minute
  rpm: number;
  // Tokens per minute
  tpm: number;
}

export const plans: Record<PlanName, PlanDetails> = {
  free: {
    models: ["free"], // Accesses models in the "free" group
    rpm: 20,
    tpm: 20000,
  },
  plus: {
    models: ["plus", "free"], // Accesses models in the "plus" and "free" groups
    rpm: 100,
    tpm: 100000,
  },
  pro: {
    models: ["pro", "plus", "free"], // Accesses models in "pro", "plus", and "free" groups
    rpm: 500,
    tpm: 500000,
  },
};