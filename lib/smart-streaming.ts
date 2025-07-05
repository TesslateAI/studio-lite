import { ExtractedCodeBlock } from './code-detection';

export interface StreamingState {
  content: string;
  codeBlocks: ExtractedCodeBlock[];
  hasSignificantChange: boolean;
  shouldRefreshPreview: boolean;
  scrollPosition?: number;
}

export interface SmartStreamingOptions {
  throttleMs: number;
  significantChangeThreshold: number;
  preserveScrollPosition: boolean;
  enableProgressiveLoading: boolean;
}

const DEFAULT_OPTIONS: SmartStreamingOptions = {
  throttleMs: 500, // Much longer delay for buttery smoothness
  significantChangeThreshold: 500, // Much higher threshold to reduce updates
  preserveScrollPosition: true,
  enableProgressiveLoading: true,
};

/**
 * Smart streaming manager that reduces flashing and improves performance
 */
export class SmartStreamingManager {
  private lastContent = '';
  private lastCodeBlocks: ExtractedCodeBlock[] = [];
  private pendingUpdate: string | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private changeBuffer: string[] = [];
  private scrollPositions = new Map<string, number>();
  
  constructor(private options: SmartStreamingOptions = DEFAULT_OPTIONS) {}

  /**
   * Process streaming content with intelligent buffering
   */
  processStreamingContent(
    content: string,
    extractCodeBlocks: (content: string) => { text: string; codeBlocks: ExtractedCodeBlock[] },
    onUpdate: (state: StreamingState) => void,
    containerId?: string
  ): void {
    this.pendingUpdate = content;
    this.changeBuffer.push(content);

    // Clear existing timer
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    // Determine if this is a significant change
    const isSignificantChange = this.isSignificantChange(content);
    const shouldImmediateUpdate = this.shouldUpdateImmediately(content);

    if (shouldImmediateUpdate) {
      this.flushUpdate(extractCodeBlocks, onUpdate, containerId);
    } else {
      // Use adaptive throttling based on change frequency
      const throttleDelay = this.calculateThrottleDelay();
      
      this.updateTimer = setTimeout(() => {
        this.flushUpdate(extractCodeBlocks, onUpdate, containerId);
      }, throttleDelay);
    }
  }

  /**
   * Force flush any pending updates
   */
  flush(
    extractCodeBlocks: (content: string) => { text: string; codeBlocks: ExtractedCodeBlock[] },
    onUpdate: (state: StreamingState) => void,
    containerId?: string
  ): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.flushUpdate(extractCodeBlocks, onUpdate, containerId);
  }

  /**
   * Store scroll position for preservation
   */
  storeScrollPosition(containerId: string, position: number): void {
    if (this.options.preserveScrollPosition) {
      this.scrollPositions.set(containerId, position);
    }
  }

  /**
   * Get stored scroll position
   */
  getScrollPosition(containerId: string): number | undefined {
    return this.scrollPositions.get(containerId);
  }

  /**
   * Reset streaming state
   */
  reset(): void {
    this.lastContent = '';
    this.lastCodeBlocks = [];
    this.pendingUpdate = null;
    this.changeBuffer = [];
    this.scrollPositions.clear();
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private flushUpdate(
    extractCodeBlocks: (content: string) => { text: string; codeBlocks: ExtractedCodeBlock[] },
    onUpdate: (state: StreamingState) => void,
    containerId?: string
  ): void {
    if (!this.pendingUpdate) return;

    const content = this.pendingUpdate;
    const result = extractCodeBlocks(content);
    
    const hasSignificantChange = this.isSignificantChange(content);
    const shouldRefreshPreview = this.shouldRefreshPreview(result.codeBlocks);

    const state: StreamingState = {
      content,
      codeBlocks: result.codeBlocks,
      hasSignificantChange,
      shouldRefreshPreview,
      scrollPosition: containerId ? this.getScrollPosition(containerId) : undefined,
    };

    // Update our tracking variables
    this.lastContent = content;
    this.lastCodeBlocks = result.codeBlocks;
    this.pendingUpdate = null;
    this.changeBuffer = [];

    onUpdate(state);
  }

  private isSignificantChange(content: string): boolean {
    const contentDiff = Math.abs(content.length - this.lastContent.length);
    return contentDiff >= this.options.significantChangeThreshold;
  }

  private shouldUpdateImmediately(content: string): boolean {
    // Update immediately for certain patterns
    const immediatePatterns = [
      /```\w+\s*$/m, // Start of code block
      /```\s*$/m,    // End of code block
      /^#+ /m,       // New heading
    ];

    return immediatePatterns.some(pattern => pattern.test(content.slice(-100)));
  }

  private shouldRefreshPreview(codeBlocks: ExtractedCodeBlock[]): boolean {
    // Only refresh if structure changed significantly
    if (codeBlocks.length !== this.lastCodeBlocks.length) {
      return true;
    }

    // Check for changes in completed blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      const current = codeBlocks[i];
      const previous = this.lastCodeBlocks[i];

      if (!previous) return true;

      // Only refresh for major code changes
      if (current.isComplete && previous.isComplete) {
        const codeDiff = Math.abs(current.code.length - previous.code.length);
        if (codeDiff > 500) { // Much larger threshold for performance
          return true;
        }
      }
      
      // Only refresh for very large streaming updates
      if (!current.isComplete && current.code.length > previous.code.length + 1000) {
        return true;
      }

      // Refresh if file structure changed
      if (current.filename !== previous.filename || 
          current.language !== previous.language ||
          current.fileType !== previous.fileType) {
        return true;
      }
    }

    return false;
  }

  private calculateThrottleDelay(): number {
    // Adaptive throttling based on update frequency
    const recentUpdates = this.changeBuffer.length;
    
    if (recentUpdates > 10) {
      // High frequency updates - increase delay
      return Math.min(this.options.throttleMs * 2, 1000);
    } else if (recentUpdates > 5) {
      // Medium frequency - normal delay
      return this.options.throttleMs;
    } else {
      // Low frequency - reduce delay
      return Math.max(this.options.throttleMs / 2, 100);
    }
  }
}

/**
 * Debounced function factory with smart flushing
 */
export function createSmartDebouncedFunction<T extends any[]>(
  fn: (...args: T) => void,
  delay: number,
  options: { 
    leading?: boolean; 
    trailing?: boolean; 
    maxWait?: number;
    shouldFlush?: (...args: T) => boolean;
  } = {}
): {
  (...args: T): void;
  flush: () => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastArgs: T | null = null;
  let lastCallTime = 0;
  let leading = options.leading ?? false;
  let trailing = options.trailing ?? true;
  let maxWait = options.maxWait;

  function invokeFunc() {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  }

  function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    invokeFunc();
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
  }

  function debouncedFunction(...args: T) {
    lastArgs = args;
    const now = Date.now();
    const shouldCallLeading = leading && !timeoutId;

    // Check if we should force flush
    if (options.shouldFlush && options.shouldFlush(...args)) {
      flush();
      return;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (shouldCallLeading) {
      invokeFunc();
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        invokeFunc();
      }
    }, delay);

    // Max wait logic
    if (maxWait && !maxTimeoutId) {
      maxTimeoutId = setTimeout(() => {
        maxTimeoutId = null;
        flush();
      }, maxWait);
    }

    lastCallTime = now;
  }

  debouncedFunction.flush = flush;
  debouncedFunction.cancel = cancel;

  return debouncedFunction;
}

/**
 * Progressive loading helper for large code blocks
 */
export class ProgressiveLoader {
  private chunks: string[] = [];
  private currentIndex = 0;
  private loadTimer: NodeJS.Timeout | null = null;

  constructor(private chunkSize: number = 1000, private loadDelay: number = 50) {}

  loadProgressively(
    content: string,
    onChunk: (chunk: string, isComplete: boolean) => void
  ): void {
    this.chunks = this.chunkContent(content);
    this.currentIndex = 0;
    this.loadNextChunk(onChunk);
  }

  stop(): void {
    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
  }

  private chunkContent(content: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Try to break at natural boundaries (lines, code blocks)
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private loadNextChunk(onChunk: (chunk: string, isComplete: boolean) => void): void {
    if (this.currentIndex >= this.chunks.length) {
      return;
    }

    const chunk = this.chunks.slice(0, this.currentIndex + 1).join('');
    const isComplete = this.currentIndex === this.chunks.length - 1;

    onChunk(chunk, isComplete);

    if (!isComplete) {
      this.currentIndex++;
      this.loadTimer = setTimeout(() => {
        this.loadNextChunk(onChunk);
      }, this.loadDelay);
    }
  }
}