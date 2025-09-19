import { NextRequest } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { ApiResponse, checkRateLimit, RateLimitConfig, checkGuestUsage } from '@/lib/api-validation';

export async function POST(req: NextRequest) {
  try {
    // Check rate limiting
    const rateLimit = checkRateLimit(req, RateLimitConfig.chat);
    if (!rateLimit.allowed) {
      return ApiResponse.rateLimited(rateLimit.resetTime);
    }

    // Get authenticated user
    const user = await getUser();
    if (!user) {
      return ApiResponse.unauthorized('Please sign in to use this feature');
    }

    // Check guest usage limits
    if (user.isGuest) {
      const guestCheck = checkGuestUsage(user.id);
      if (!guestCheck.allowed) {
        return ApiResponse.guestLimitExceeded(guestCheck.resetTime, guestCheck.remainingMessages);
      }
    }

    // Parse request body
    const body = await req.json();
    const { context, modelId } = body;

    if (!context || context.length < 5) {
      return ApiResponse.error('Context must be at least 5 characters long');
    }

    // Use the user's virtual key for LiteLLM
    const apiBase = process.env.LITELLM_PROXY_URL || 'https://apin.tesslate.com';
    const apiKey = user.litellmVirtualKey;

    if (!apiKey) {
      return ApiResponse.error('No API key configured. Please check your account settings.');
    }

    // First, generate the complete flow with AI
    const flowSystemPrompt = `You are an expert UI/UX designer specializing in creating complete application flows.
Analyze the context and create a comprehensive user journey with detailed screens.

You must respond with a valid JSON object in this exact format:
{
  "screens": [
    {
      "prompt": "Very detailed prompt describing EXACTLY what should be on this screen, including all UI elements, layout, content, interactions, and visual styling",
      "screenType": "desktop" | "mobile" | "tablet",
      "description": "brief description of this screen's purpose in the flow",
      "order": number indicating position in user flow
    }
  ],
  "reasoning": "explanation of the user journey and flow",
  "userJourney": "brief description like: Landing → Login → Dashboard → Features",
  "designSystem": {
    "colors": {
      "primary": "hex color that fits the app context",
      "secondary": "hex color",
      "background": "hex color",
      "text": "hex color",
      "accent": "hex color"
    },
    "typography": {
      "fontFamily": "font stack",
      "headingWeight": "font weight number",
      "bodyWeight": "font weight number"
    },
    "spacing": {
      "borderRadius": "px value",
      "padding": "px value"
    },
    "style": "description of overall visual style"
  }
}

IMPORTANT: 
- Create 4-8 screens that form a complete user journey
- Each prompt must be extremely detailed and specific
- Consider the type of application and create appropriate screens
- Include all necessary UI elements in each prompt`;

    const flowUserPrompt = `Create a complete application flow for: "${context}"

Analyze what type of application this is and generate:
1. A logical sequence of screens following the user journey
2. Detailed prompts for each screen with specific UI elements
3. A cohesive design system that matches the context`;

    // Generate the flow
    const flowResponse = await fetch(`${apiBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://designer.tesslate.com',
        'X-Title': 'Studio Designer'
      },
      body: JSON.stringify({
        model: modelId || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: flowSystemPrompt },
          { role: 'user', content: flowUserPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!flowResponse.ok) {
      const error = await flowResponse.text();
      console.error('LiteLLM flow generation error:', error);
      return ApiResponse.error('Failed to generate flow', flowResponse.status);
    }

    const flowData = await flowResponse.json();
    let parsedFlow;
    
    try {
      const content = flowData.choices[0]?.message?.content;
      if (!content) throw new Error('No content in response');
      parsedFlow = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse flow response:', e);
      return ApiResponse.error('Failed to parse flow response');
    }

    // Now generate the design system HTML based on the AI's design decisions
    const htmlSystemPrompt = `You are an expert front-end developer. Create a complete HTML file that showcases a design system.
    
You must create a valid, complete HTML file that demonstrates the design system with:
- CSS variables for all colors and values
- Example components (buttons, cards, inputs, navigation)
- Proper styling that matches the design specifications
- Modern, clean code

Return ONLY the complete HTML code, nothing else.`;

    const htmlUserPrompt = `Create a design system HTML file for an application with this context: "${context}"

Use these design specifications:
${JSON.stringify(parsedFlow.designSystem, null, 2)}

Create a complete HTML file that shows:
1. Color palette in CSS variables
2. Typography examples
3. Button styles (primary, secondary, disabled)
4. Card component
5. Input field styles
6. Navigation example
7. All using the exact colors and styles from the design system above`;

    // Generate the HTML
    const htmlResponse = await fetch(`${apiBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://designer.tesslate.com',
        'X-Title': 'Studio Designer'
      },
      body: JSON.stringify({
        model: modelId || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: htmlSystemPrompt },
          { role: 'user', content: htmlUserPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!htmlResponse.ok) {
      console.error('Failed to generate design system HTML');
      // Continue without HTML if it fails
    }

    let designSystemHTML = '';
    try {
      const htmlData = await htmlResponse.json();
      designSystemHTML = htmlData.choices[0]?.message?.content || '';
      
      // Clean up the HTML if it has markdown code blocks
      designSystemHTML = designSystemHTML.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    } catch (e) {
      console.error('Failed to parse HTML response:', e);
    }

    // Sort screens by order if provided
    if (parsedFlow.screens && parsedFlow.screens[0]?.order) {
      parsedFlow.screens.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    }

    return ApiResponse.success({
      screens: parsedFlow.screens,
      reasoning: parsedFlow.reasoning,
      userJourney: parsedFlow.userJourney,
      designSystemHTML,
      designSystem: parsedFlow.designSystem
    });

  } catch (error: any) {
    console.error('Autoflow generation error:', error);
    
    return ApiResponse.error(
      error?.message || 'Failed to generate autoflow suggestions',
      500
    );
  }
}