// lib/litellm/api.ts
// This file should ONLY be used on the server.

const LITELLM_PROXY_URL = process.env.LITELLM_PROXY_URL || "hi";
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

if (!LITELLM_PROXY_URL || !LITELLM_MASTER_KEY) {
  throw new Error("LiteLLM proxy URL or master key is not configured in environment variables.");
}

async function fetchLiteLLM(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${LITELLM_PROXY_URL.replace(/\/$/, '')}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LiteLLM API Error (${response.status}): ${errorBody}`);
    throw new Error(`Failed to call LiteLLM endpoint ${endpoint}. Status: ${response.status}`);
  }

  return response.json();
}

interface KeyGenerateOptions {
  user_id: string;
  models: string[];
  rpm_limit: number;
  tpm_limit: number;
  duration?: string; // e.g., "30d" for 30 days
}

// Added a specific response type for better type-safety
interface KeyGenerateResponse {
  key: string;
  user_id: string;
  // ... other properties from the LiteLLM API response if needed
}

export async function generateKey(options: KeyGenerateOptions): Promise<KeyGenerateResponse> {
  return fetchLiteLLM('/key/generate', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

interface KeyUpdateOptions {
  key: string;
  models?: string[];
  rpm_limit?: number;
  tpm_limit?: number;
}

export async function updateKey(options: KeyUpdateOptions) {
  return fetchLiteLLM('/key/update', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function deleteKey(key: string) {
  return fetchLiteLLM('/key/delete', {
    method: 'POST',
    body: JSON.stringify({ keys: [key] }),
  });
}