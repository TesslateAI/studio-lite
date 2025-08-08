// lib/litellm/api.ts

import { z } from 'zod';

// Environment validation
const envSchema = z.object({
  LITELLM_PROXY_URL: z.string().url().default("https://apin.tesslate.com"),
  // CRITICAL: LITELLM_MASTER_KEY must be provided in environment - no insecure fallback
  LITELLM_MASTER_KEY: z.string().min(1, "LITELLM_MASTER_KEY is required"),
  NODE_ENV: z.enum(["development", "production"]).default("development")
});

// Validate environment variables at startup with proper error handling
let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error("❌ Environment validation failed:", error);
  if (error instanceof z.ZodError) {
    console.error("Missing or invalid environment variables:");
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  throw new Error("Application cannot start without valid environment configuration");
}

// Type definitions for key management
interface KeyGenerateOptions {
  user_id: string;
  models: string[];
  rpm_limit: number;
  tpm_limit: number;
  duration?: string;
}

interface KeyGenerateResponse {
  key: string;
  user_id: string;
  expires_at?: string;
  // Add other potential fields for type safety
  key_name?: string;
  key_alias?: string;
}

interface KeyUpdateOptions {
  key: string;
  models?: string[];
  rpm_limit?: number;
  tpm_limit?: number;
}

// Type definition for chat
export type ChatCompletionParams = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
};

// Unified fetch client for all LiteLLM proxy communications
async function litellmFetch(endpoint: string, options: RequestInit & { secretKey?: string } = {}): Promise<Response> {
  // Validate endpoint parameter
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error("Invalid endpoint provided to litellmFetch");
  }

  let url: string;
  try {
    url = new URL(endpoint, env.LITELLM_PROXY_URL).toString();
  } catch (error) {
    throw new Error(`Invalid URL construction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Security: Validate authorization key before using it
  const authKey = options.secretKey || env.LITELLM_MASTER_KEY;
  if (!authKey) {
    throw new Error("Invalid or missing authorization key");
  }
  headers.set('Authorization', `Bearer ${authKey}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(600000), // 10 minute timeout
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("Request timeout - LiteLLM proxy did not respond within 10 minutes");
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    // Don't log sensitive information in production
    if (env.NODE_ENV === 'development') {
      console.error(`LiteLLM API Error (${response.status}) on endpoint ${endpoint}: ${errorBody}`);
    }
    throw new Error(`LiteLLM request failed with status ${response.status}: ${response.statusText}`);
  }

  return response;
}

// --- API Methods ---

/**
 * Sends a chat completion request to the LiteLLM proxy.
 * This function should be authenticated with the user's VIRTUAL key.
 */
export async function generateChatCompletion(
    secretKey: string, // This is the user's virtual key, e.g., 'sk-...'
    params: ChatCompletionParams
): Promise<Response> {
  if (!secretKey) {
    throw new Error("Cannot make chat completion request without a user virtual key.");
  }
  
  const response = await litellmFetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify(params),
    secretKey: secretKey, // Pass the user's virtual key here
  });

  return response; // Return the raw response for the client to handle the stream
}

/**
 * Asks the LiteLLM proxy to generate a new virtual key.
 * This function MUST be authenticated with the LITELLM_MASTER_KEY.
 */
export async function generateKey(options: KeyGenerateOptions): Promise<KeyGenerateResponse> {
  const response = await litellmFetch('/key/generate', {
    method: 'POST',
    body: JSON.stringify(options),
    // No secretKey provided, so litellmFetch uses the master key by default
  });

  // FIX: Directly parse the JSON from the response. Do not re-wrap it.
  return response.json();
}

/**
 * Asks the LiteLLM proxy to update an existing virtual key.
 * This function MUST be authenticated with the LITELLM_MASTER_KEY.
 */
export async function updateKey(options: KeyUpdateOptions) {
  const response = await litellmFetch('/key/update', {
    method: 'POST',
    body: JSON.stringify(options),
  });
  // FIX: Correctly parse the JSON response.
  return response.json();
}

/**
 * Asks the LiteLLM proxy to delete a virtual key.
 * This function MUST be authenticated with the LITELLM_MASTER_KEY.
 */
export async function deleteKey(key: string) {
  const response = await litellmFetch('/key/delete', {
    method: 'POST',
    body: JSON.stringify({ keys: [key] }),
  });
  // FIX: Correctly parse the JSON response.
  return response.json();
}