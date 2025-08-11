import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionStream } from '@/lib/stream-processing';
import { extractAllCodeBlocks, extractStreamingCodeBlocks } from '@/lib/code-detection';
import { SandboxManager } from '@/lib/sandbox-manager';
import { Message } from '@/lib/messages';
import { ScreenType } from '../types';

interface GenerateDesignOptions {
  prompt: string;
  screenType: ScreenType;
  selectedModel: string;
  onStreamingUpdate: (content: string) => void;
  onComplete: (files: any, sandboxManager: SandboxManager) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function generateDesign({
  prompt,
  screenType,
  selectedModel,
  onStreamingUpdate,
  onComplete,
  onError,
  signal
}: GenerateDesignOptions) {
  try {
    // Build the generation prompt based on screen type
    const screenTypePrompts: Record<ScreenType, string> = {
      desktop: 'Create a responsive desktop web design (1024x768) with modern UI patterns.',
      mobile: 'Create a mobile-first design (375x667) optimized for touch interactions and small screens.',
      tablet: 'Create a tablet-optimized design (768x1024) that works well in both portrait and landscape.',
      watch: 'Create a minimalist watch interface (280x280) with clear, glanceable information.',
      tv: 'Create a TV interface (1920x1080) optimized for remote control navigation and viewing from a distance.'
    };

    const fullPrompt = `${screenTypePrompts[screenType]}

User request: ${prompt}

Create a complete, self-contained HTML file with embedded CSS and JavaScript. 
- Use modern, beautiful design with gradients, shadows, and animations
- Make it fully interactive and responsive
- Include all styles inline within <style> tags
- Include any JavaScript within <script> tags
- Ensure the design is pixel-perfect and professional
- Use modern CSS features like flexbox, grid, and custom properties
- Add smooth transitions and hover effects where appropriate`;

    const messages: Message[] = [
      {
        id: uuidv4(),
        role: 'user',
        content: [{ type: 'text', text: fullPrompt }]
      }
    ];

    const response = await fetch('/api/proxy/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        selectedModelId: selectedModel,
      }),
      signal
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({ error: 'Generation failed' }));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }

    const stream = ChatCompletionStream.fromReadableStream(response.body);
    let fullContent = '';
    const sandboxManager = new SandboxManager();

    stream.on('content', (_, content) => {
      fullContent = content;
      
      // Send streaming content for preview
      onStreamingUpdate(fullContent);
      
      // Extract code blocks while streaming
      const { codeBlocks } = extractStreamingCodeBlocks(fullContent);
      
      if (codeBlocks.length > 0) {
        sandboxManager.clear();
        codeBlocks.forEach(block => {
          // Ensure proper filename
          const filename = block.filename.includes('.') 
            ? block.filename 
            : block.filename + '.html';
          sandboxManager.addFile(`/${filename.replace(/^\//, '')}`, block.code);
        });
      }
    });

    stream.on('finalContent', (finalContent) => {
      const { codeBlocks } = extractAllCodeBlocks(finalContent);
      
      if (codeBlocks.length > 0) {
        sandboxManager.clear();
        codeBlocks.forEach(block => {
          const filename = block.filename.includes('.') 
            ? block.filename 
            : block.filename + '.html';
          sandboxManager.addFile(`/${filename.replace(/^\//, '')}`, block.code);
        });
      } else {
        // If no code blocks found, try to extract HTML from the response
        const htmlMatch = finalContent.match(/```html\n([\s\S]*?)```/);
        if (htmlMatch) {
          sandboxManager.clear();
          sandboxManager.addFile('/index.html', htmlMatch[1]);
        }
      }

      onComplete(sandboxManager.getState().files, sandboxManager);
    });

    await stream.start();
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      onError(error.message || 'Generation failed');
    }
  }
}