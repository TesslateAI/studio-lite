import { NextRequest } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { generateChatCompletion } from '@/lib/litellm/api';
import { Message } from '@/lib/messages';
// NEW: Import the dynamic prompt manager instead of the JSON file
import { getSystemPrompt } from '@/lib/prompt-manager';

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

    const messagesForApi = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content.map(c => c.text).join(''),
      }));

    if (messagesForApi.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages to send' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // --- MODIFIED: Logic to add the DYNAMIC system prompt ---

    // 1. (Optional) Gather any context needed for prompt injection.
    //    For now, we'll pass an empty context object.
    const promptContext = {}; 

    // 2. Generate the system prompt by calling our new function.
    const systemPromptContent = getSystemPrompt(selectedModelId, promptContext);

    console.log('Selected model ID:', selectedModelId);
    console.log('System prompt being sent:', systemPromptContent.substring(0, 500) + '...');

    // 3. Prepend the system message to the final message array.
    const finalMessagesForApi = [
      { role: 'system', content: systemPromptContent },
      ...messagesForApi,
    ];
    // --- END MODIFICATION ---

    const liteLLMResponse = await generateChatCompletion(
      user.litellmVirtualKey,
      {
        model: selectedModelId,
        messages: finalMessagesForApi, // Use the array with the dynamic prompt
        stream: true,
      }
    );

    return new Response(liteLLMResponse.body, {
      status: liteLLMResponse.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any)
  {
    console.error('[API Proxy Error]', error);
    const errorMessage = error.message || 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}