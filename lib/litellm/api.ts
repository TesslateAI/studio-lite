// lib/litellm/api.ts

import { z } from 'zod';

// Environment validation
const envSchema = z.object({
  LITELLM_PROXY_URL: z.string().url().default("https://apin.tesslate.com"),
  // It's crucial that your .env file provides a LITELLM_MASTER_KEY.
  // The default 'hi' is what causes the error if the .env var is not loaded.
  LITELLM_MASTER_KEY: z.string().min(1).default("hi"),
  NODE_ENV: z.enum(["development", "production"]).default("development")
});

const env = envSchema.parse(process.env);

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
  const url = new URL(endpoint, env.LITELLM_PROXY_URL).toString();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Use the master key for key management, or the provided user virtual key for chat.
  // If a user-specific secretKey is missing, it falls back to the master key.
  headers.set('Authorization', `Bearer ${options.secretKey || env.LITELLM_MASTER_KEY}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LiteLLM API Error (${response.status}) on endpoint ${endpoint}: ${errorBody}`);
    // Re-throw the error with a more informative message
    throw new Error(`LiteLLM request failed with status ${response.status}: ${errorBody}`);
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