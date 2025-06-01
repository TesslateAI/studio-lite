// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import modelsList from '@/lib/models.json'; // Ensure this path is correct

export const runtime = 'edge';

// In-memory store for guest rate limiting (for demo/dev only)
const globalAny = globalThis as any;
const guestRateLimitMap = globalAny.guestRateLimitMap || (globalAny.guestRateLimitMap = new Map());
const GUEST_LIMIT = 5;
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown-ip'
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const selectedModelId = body.selectedModelId || '';

  // Find the model configuration
  const modelConfig = modelsList.models.find((m: any) => m.id === selectedModelId);

  // Determine API base, API key, and Model name
  let apiBase = process.env.OPENAI_API_BASE; // Default API base
  let apiKey = process.env.OPENAI_API_KEY;   // Default API key
  let modelName = process.env.OPENAI_MODEL_NAME; // Default model name for the API call

  if (modelConfig) {
    // Use model-specific identifier for the API if envKey is present
    if (modelConfig.envKey && process.env[modelConfig.envKey]) {
      modelName = process.env[modelConfig.envKey];
    }
    // Override API base if apiBaseEnvKey is present and corresponding env var exists
    if (modelConfig.apiBaseEnvKey && process.env[modelConfig.apiBaseEnvKey]) {
      apiBase = process.env[modelConfig.apiBaseEnvKey];
    }
    // Override API key if apiKeyEnvKey is present and corresponding env var exists
    if (modelConfig.apiKeyEnvKey && process.env[modelConfig.apiKeyEnvKey]) {
      apiKey = process.env[modelConfig.apiKeyEnvKey];
    }
  }

  console.log(`[CHAT API] Selected Model ID: ${selectedModelId}`);
  console.log(`[CHAT API] Using Model Name for API: ${modelName}`);
  console.log(`[CHAT API] Using API Base: ${apiBase}`);
  // Avoid logging the API key directly in production logs for security.
  // console.log(`[CHAT API] Using API Key: ${apiKey ? '********' : 'Not Set'}`);


  // Guest mode check
  const session = req.cookies.get('session');
  if (!session) {
    const ip = getClientIp(req);
    let res = new NextResponse(); // Define res here for potential cookie setting
    const key = ip;
    let entry = guestRateLimitMap.get(key);
    const now = Date.now();
    if (!entry || now - entry.start > GUEST_WINDOW_MS) {
      entry = { count: 0, start: now };
    }
    console.log(`[GUEST RATE LIMIT] IP: ${ip}, Count: ${entry.count}, Limit: ${GUEST_LIMIT}`);
    if (entry.count >= GUEST_LIMIT) {
      return new NextResponse(
        JSON.stringify({ error: 'Guest message limit reached. Please sign up for more access.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    entry.count += 1;
    guestRateLimitMap.set(key, entry);
  }

  // Validate API configuration
  if (!apiBase || !apiKey || !modelName) {
    return new NextResponse(
      JSON.stringify({ error: 'API configuration is missing. Please check server environment variables for API base, key, or model name.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward the request to the determined API endpoint
  // IMPORTANT: This assumes the target API is OpenAI-compatible (e.g., path /v1/chat/completions and Bearer token auth)
  // If not, you'll need more complex logic here to adapt to different API structures.
  const apiUrl = `${apiBase.replace(/\/$/, '')}/v1/chat/completions`; 
  
  const externalApiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`, // Assumes Bearer token authentication
    },
    body: JSON.stringify({
      model: modelName, // The actual model name/identifier for the API
      messages: body.messages,
      stream: true,
    }),
  });

  // Stream the response from the external API directly to the client
  return new Response(externalApiResponse.body, {
    status: externalApiResponse.status,
    headers: {
      'Content-Type': externalApiResponse.headers.get('Content-Type') || 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// The GET function remains the same for guest count
export async function GET(req: NextRequest) {
  const session = req.cookies.get('session');
  if (!session) {
    const ip = getClientIp(req);
    const key = ip;
    const entry = guestRateLimitMap.get(key);
    const now = Date.now();
    let count = 0;
    let remainingMs = GUEST_WINDOW_MS;
    if (entry && now - entry.start <= GUEST_WINDOW_MS) {
      count = entry.count;
      remainingMs = GUEST_WINDOW_MS - (now - entry.start);
    }
    return new NextResponse(
      JSON.stringify({ count, limit: GUEST_LIMIT, windowMs: GUEST_WINDOW_MS, remainingMs }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Logged-in users: no guest limit
  return new NextResponse(
    JSON.stringify({ count: null, limit: null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}