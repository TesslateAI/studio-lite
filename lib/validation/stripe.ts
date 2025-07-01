import { z } from 'zod';

// Valid plan names for strict validation
export const VALID_PLAN_NAMES = ['free', 'plus', 'pro', 'enterprise'] as const;

export const planNameSchema = z.enum(VALID_PLAN_NAMES, {
  errorMap: () => ({ message: 'Invalid plan name provided' })
});

export const stripeCheckoutSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  productName: z.string().min(1, 'Product name is required')
});

export const creatorCodeSchema = z.object({
  code: z.string()
    .regex(/^[A-Z0-9]{8}$/, 'Creator code must be 8 uppercase alphanumeric characters')
    .length(8, 'Creator code must be exactly 8 characters')
});

export function validatePlanName(planName: string): string {
  const validated = planNameSchema.safeParse(planName.toLowerCase());
  if (!validated.success) {
    throw new Error(`Invalid plan name: ${planName}. Must be one of: ${VALID_PLAN_NAMES.join(', ')}`);
  }
  return validated.data;
}

export function validateCreatorCode(code: string): string {
  const validated = creatorCodeSchema.safeParse({ code });
  if (!validated.success) {
    throw new Error(`Invalid creator code format: ${validated.error.errors[0]?.message}`);
  }
  return validated.data.code;
}