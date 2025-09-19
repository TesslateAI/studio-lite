import { NextRequest, NextResponse } from 'next/server';
import modelsList from '@/lib/models.json';
import { Model } from '@/lib/types';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { rateLimit, RATE_LIMITS } from '@/lib/auth/rate-limit';
import { getUser } from '@/lib/db/queries';

// Using Node.js runtime for better security with Firebase Admin SDK
// export const runtime = 'edge';

async function handleChat(req: AuthenticatedRequest): Promise<NextResponse> {
  const body = await req.json();
  const selectedModelId = body.selectedModelId || 'WEBGEN-SMALL'; // Default model

  // Check if the selected model exists in our list
  const modelConfig = (modelsList.models as Model[]).find(m => m.id === selectedModelId);
  
  if (!modelConfig) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid model selected.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get the full user details including virtual key
  const user = await getUser();
  if (!user) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // All models go through LiteLLM proxy
  const apiBase = process.env.LITELLM_PROXY_URL || 'https://apin.tesslate.com';
  const apiKey = user.litellmVirtualKey; // Use the user's virtual key
  
  if (!apiKey) {
    return new NextResponse(
      JSON.stringify({ error: 'No API key configured. Please check your account settings.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `${apiBase.replace(/\/$/, '')}/v1/chat/completions`;
  
  try {
    const externalApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModelId, // Use the model ID directly (e.g., "WEBGEN-SMALL", "cerebras/qwen-3-coder-480b")
        messages: body.messages,
        stream: true,
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 4096,
      }),
    });

    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      console.error('LiteLLM error:', errorText);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to process chat request.' }),
        { status: externalApiResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new NextResponse(externalApiResponse.body, {
      status: externalApiResponse.status,
      headers: {
        'Content-Type': externalApiResponse.headers.get('Content-Type') || 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const POST = requireAuth(rateLimit(RATE_LIMITS.CHAT)(handleChat));