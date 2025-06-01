import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import modelsList from '@/lib/models.json';

export const runtime = 'edge';

// In-memory store for guest rate limiting (for demo/dev only)
const globalAny = globalThis as any;
const guestRateLimitMap = globalAny.guestRateLimitMap || (globalAny.guestRateLimitMap = new Map());
const GUEST_LIMIT = 5;
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function getClientIp(req: NextRequest) {
  // Try to get IP from headers (works on Vercel/Edge)
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown-ip'
  );
}

function getOrSetGuestSessionId(req: NextRequest, res: NextResponse) {
  let sessionId = req.cookies.get('guest_session_id')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookies.set('guest_session_id', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
    });
  }
  return sessionId;
}

export async function POST(req: NextRequest) {
  // Parse the incoming request body
  const body = await req.json();

  // Get selected model id from request body, fallback to default
  const selectedModelId = body.selectedModelId || '';
  let resolvedModelName: string | undefined;
  let resolvedApiBase: string | undefined;
  let resolvedApiKey: string | undefined;
  if (selectedModelId) {
    const model = modelsList.models.find((m: any) => m.id === selectedModelId);
    if (model) {
      if (model.envKey && process.env[model.envKey]) {
        resolvedModelName = process.env[model.envKey];
      }
      if (model.apiBaseEnvKey && process.env[model.apiBaseEnvKey]) {
        resolvedApiBase = process.env[model.apiBaseEnvKey];
      }
      if (model.apiKeyEnvKey && process.env[model.apiKeyEnvKey]) {
        resolvedApiKey = process.env[model.apiKeyEnvKey];
      }
    }
    if (!model) {
      throw new Error(`Model with id '${selectedModelId}' not found in models.json`);
    }
    if (!resolvedModelName) {
      throw new Error(`Environment variable for model name (${model.envKey}) is not set for model id '${selectedModelId}'`);
    }
    if (!resolvedApiBase) {
      throw new Error(`Environment variable for API base (${model.apiBaseEnvKey}) is not set for model id '${selectedModelId}'`);
    }
    if (!resolvedApiKey) {
      throw new Error(`Environment variable for API key (${model.apiKeyEnvKey}) is not set for model id '${selectedModelId}'`);
    }
  } else {
    throw new Error('No model selected. Please provide a selectedModelId.');
  }
  console.log(`[CHAT API] Using model: ${resolvedModelName} (selectedModelId: ${selectedModelId})`);

  // Check if user is logged in (simple check: presence of session cookie)
  const session = req.cookies.get('session');
  if (!session) {
    // Guest mode
    const ip = getClientIp(req);
    let res = new NextResponse();
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
    // Forward the request to the VLLM endpoint (OpenAI-compatible)
    const apiBase = resolvedApiBase;
    const apiKey = resolvedApiKey;
    const modelName = resolvedModelName;
    if (!apiBase || !apiKey || !modelName) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required environment variables for model API.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const vllmResponse = await fetch(`${apiBase.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: body.messages,
        stream: true,
      }),
    });
    // Stream the response from VLLM directly to the client
    return new Response(vllmResponse.body, {
      status: vllmResponse.status,
      headers: {
        'Content-Type': vllmResponse.headers.get('Content-Type') || 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });
  }

  // Logged-in user: no guest rate limit
  const apiBase = resolvedApiBase;
  const apiKey = resolvedApiKey;
  const modelName = resolvedModelName;
  if (!apiBase || !apiKey || !modelName) {
    return new NextResponse(
      JSON.stringify({ error: 'Missing required environment variables for model API.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const vllmResponse = await fetch(`${apiBase.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: body.messages,
      stream: true,
    }),
  });
  return new Response(vllmResponse.body, {
    status: vllmResponse.status,
    headers: {
      'Content-Type': vllmResponse.headers.get('Content-Type') || 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
}

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