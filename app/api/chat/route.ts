import { NextRequest, NextResponse } from 'next/server';
import modelsList from '@/lib/models.json';
import { Model } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const selectedModelId = body.selectedModelId || '';

  const modelConfig = (modelsList.models as Model[]).find(m => m.id === selectedModelId);

  let apiBase = process.env.OPENAI_API_BASE;
  let apiKey = process.env.OPENAI_API_KEY;
  let modelName = process.env.OPENAI_MODEL_NAME;

  if (modelConfig) {
    if (modelConfig.envKey && process.env[modelConfig.envKey]) {
      modelName = process.env[modelConfig.envKey];
    }
    if (modelConfig.apiBaseEnvKey && process.env[modelConfig.apiBaseEnvKey]) {
      apiBase = process.env[modelConfig.apiBaseEnvKey];
    }
    if (modelConfig.apiKeyEnvKey && process.env[modelConfig.apiKeyEnvKey]) {
      apiKey = process.env[modelConfig.apiKeyEnvKey];
    }
  }

  if (!apiBase || !apiKey || !modelName) {
    return new NextResponse(
      JSON.stringify({ error: 'API configuration is missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `${apiBase.replace(/\/$/, '')}/v1/chat/completions`; 
  
  const externalApiResponse = await fetch(apiUrl, {
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

  return new Response(externalApiResponse.body, {
    status: externalApiResponse.status,
    headers: {
      'Content-Type': externalApiResponse.headers.get('Content-Type') || 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
}