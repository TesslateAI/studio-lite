// No import from 'ai' is needed here anymore

type EventCallbacks = {
  content: (delta: string, content: string) => void;
  // Using 'any' here is a pragmatic choice for compatibility with the older 'ai' package.
  // The structure of the chunk is specific to the underlying API (e.g., OpenAI).
  chunk: (chunk: any) => void;
  finalContent: (content: string) => void;
};

export class ChatCompletionStream {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder: TextDecoder;
  private callbacks: Partial<EventCallbacks> = {};
  private accumulatedContent = '';

  constructor(reader: ReadableStreamDefaultReader<Uint8Array>) {
    this.reader = reader;
    this.decoder = new TextDecoder();
  }

  static fromReadableStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    return new ChatCompletionStream(reader);
  }

  on<E extends keyof EventCallbacks>(event: E, callback: EventCallbacks[E]): this {
    this.callbacks[event] = callback;
    return this;
  }

  async start() {
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) {
          if (this.callbacks.finalContent) {
            this.callbacks.finalContent(this.accumulatedContent);
          }
          break;
        }

        buffer += this.decoder.decode(value, { stream: true });
        
        // Process buffer line by line
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);

            if (line.startsWith('data:')) {
                const dataStr = line.replace('data:', '').trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices?.[0]?.delta?.content ?? '';

                    if (this.callbacks.chunk) {
                        this.callbacks.chunk(data);
                    }

                    if (content && this.callbacks.content) {
                        this.accumulatedContent += content;
                        this.callbacks.content(content, this.accumulatedContent);
                    }
                } catch (e) {
                    // This is where we handle the unterminated string error.
                    // We just log it and continue, waiting for the rest of the JSON object.
                    console.warn('Skipping malformed JSON chunk:', dataStr);
                }
            }
            boundary = buffer.indexOf('\n');
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw error;
    } finally {
      this.reader.releaseLock();
    }
  }
}

// Throttle function for streaming updates
export function createThrottledFunction<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, call immediately
      lastCallTime = now;
      fn(...args);
    } else {
      // Not enough time has passed, schedule for later
      lastArgs = args;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const remainingDelay = delay - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          lastCallTime = Date.now();
          fn(...lastArgs);
          lastArgs = null;
        }
        timeoutId = null;
      }, remainingDelay);
    }
  }) as T & { flush: () => void };

  throttled.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      lastArgs = null;
      timeoutId = null;
      lastCallTime = Date.now();
    }
  };

  return throttled;
}

// Debounce function for final updates
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, delay);
  }) as T & { flush: () => void };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      lastArgs = null;
      timeoutId = null;
    }
  };

  return debounced;
}