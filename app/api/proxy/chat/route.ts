import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/db/queries';
import { generateChatCompletion } from '@/lib/litellm/api';
import { Message } from '@/lib/messages';
import { getSystemPrompt } from '@/lib/prompt-manager';
import { 
  CommonSchemas, 
  validateRequestBody, 
  ApiResponse,
  checkGuestUsage
} from '@/lib/api-validation';

// Chat-specific validation schema
const ChatRequestSchema = z.object({
  messages: z.array(CommonSchemas.message)
    .min(1, "At least one message is required")
    .max(100, "Too many messages in conversation"),
  selectedModelId: CommonSchemas.modelId,
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

export async function POST(req: NextRequest) {
  try {
    // Validate user authorization
    const user = await getUser();
    if (!user) {
      return ApiResponse.unauthorized('Unauthorized');
    }

    // Check for LiteLLM key, create one if missing for guests
    if (!user.litellmVirtualKey) {
      console.warn(`User ${user.id} missing LiteLLM key. ${user.isGuest ? 'Guest user' : 'Regular user'} - attempting to create key.`);
      
      if (user.isGuest) {
        try {
          const { createUserKey } = await import('@/lib/litellm/management');
          const newKey = await createUserKey(user, 'free');
          console.log(`Created missing LiteLLM key for guest user ${user.id}: ${newKey.substring(0, 8)}...`);
          
          // Update the user object with the new key so we can continue
          user.litellmVirtualKey = newKey;
        } catch (error) {
          console.error(`Failed to create LiteLLM key for guest user ${user.id}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: user.id,
            isGuest: user.isGuest
          });
          return ApiResponse.error('Service temporarily unavailable. Please try refreshing the page or sign up for full access.', 503);
        }
      } else {
        return ApiResponse.unauthorized('Missing API key - please contact support');
      }
    }

    // Server-side guest user restrictions
    if (user.isGuest) {
      const guestCheck = checkGuestUsage(user.id);
      if (!guestCheck.allowed) {
        return ApiResponse.guestLimitExceeded(guestCheck.resetTime, guestCheck.remainingMessages);
      }
      
      // Add guest usage headers to response for client-side tracking
      // This will be handled when we return the final response
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch (error) {
      return ApiResponse.error('Invalid JSON in request body', 400);
    }

    // Validate request schema
    const validation = validateRequestBody(ChatRequestSchema, requestBody);
    if (!validation.success) {
      return ApiResponse.error('Invalid request format', 400, validation.errors);
    }

    const { messages, selectedModelId } = validation.data;

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

  } catch (error: unknown) {
    // Log error for debugging but don't expose sensitive information
    console.error('[API Proxy Error]', error instanceof Error ? error.message : 'Unknown error');
    
    // Return sanitized error response
    return ApiResponse.error(
      'An internal server error occurred. Please try again later.',
      500
    );
  }
}