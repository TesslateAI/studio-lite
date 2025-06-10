import { z } from 'zod';

// Environment validation
const envSchema = z.object({
  LITELLM_PROXY_URL: z.string().url().default("http://localhost:4000"),
  LITELLM_MASTER_KEY: z.string().min(1).default("hi"),
  NODE_ENV: z.enum(["development", "production"]).default("development")
});

const env = envSchema.parse(process.env);

// Type definitions
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
}

// Zod schema for chat completion response
const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.enum(['assistant', 'user', 'system']),
      content: z.string(),
    }),
    finish_reason: z.string().optional(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

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

// Unified fetch client
async function litellmFetch<T>(endpoint: string, options: RequestInit & { secretKey?: string } = {}): Promise<Response> {
  const url = new URL(endpoint, env.LITELLM_PROXY_URL).toString();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${options.secretKey || env.LITELLM_MASTER_KEY}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LiteLLM API Error (${response.status}): ${errorBody}`);
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// API methods
export async function generateChatCompletion(
    secretKey: string,
    params: ChatCompletionParams
):  Promise<ReadableStream | z.infer<typeof ChatCompletionResponseSchema>> {
  const response = await litellmFetch('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify(params),
    secretKey
  });

  return response;
}

export async function generateKey(options: KeyGenerateOptions): Promise<KeyGenerateResponse> {
  return litellmFetch('/key/generate', {
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
  return litellmFetch('/key/update', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function deleteKey(key: string) {
  return litellmFetch('/key/delete', {
    method: 'POST',
    body: JSON.stringify({ keys: [key] }),
  });
}
