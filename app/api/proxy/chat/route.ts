import { NextRequest } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { generateChatCompletion } from '@/lib/litellm/api';
import { Message } from '@/lib/messages';

// FIX: Removed 'export const runtime = 'edge';' to allow the use of Node.js APIs
// required by firebase-admin. The route will now default to the Node.js runtime.

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.litellmVirtualKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing API key' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { messages, selectedModelId } = (await req.json()) as {
      messages: Message[];
      selectedModelId: string;
    };

    // Map the client-side message format to what the LLM API expects.
    const messagesForApi = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content.map(c => c.text).join(''),
      }));

    if (messagesForApi.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages to send' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const liteLLMResponse = await generateChatCompletion(
      user.litellmVirtualKey, // Use the user's key securely on the server
      {
        model: selectedModelId,
        messages: messagesForApi,
        stream: true,
      }
    );

    // Stream the response from LiteLLM directly back to the client.
    return new Response(liteLLMResponse.body, {
      status: liteLLMResponse.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[API Proxy Error]', error);
    const errorMessage = error.message || 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}