# Streaming Code Detection and Sandbox Architecture

## Overview

This system provides real-time code detection and streaming to a sandbox environment as the AI generates code. When code blocks are detected in the AI's response, they are immediately streamed to a Sandpack preview, allowing users to see the code being written in real-time.

## Key Components

### 1. Code Detection (`lib/code-detection.ts`)

- **`splitByFirstCodeFence()`**: Detects and parses code blocks in markdown
- **`extractFirstCodeBlock()`**: Extracts code block details including language and filename
- **`detectCodeFenceStart()`**: Identifies the start of a code fence with metadata
- **`determineFilePath()`**: Maps languages to appropriate file paths

### 2. Stream Processing (`lib/stream-processing.ts`)

- **`ChatCompletionStream`**: Wrapper for OpenAI streaming responses
- **`createThrottledFunction()`**: Throttles frequent updates to prevent API overload
- **`createDebouncedFunction()`**: Debounces final updates

### 3. Sandbox Manager (`lib/sandbox-manager.ts`)

- **`SandboxManager`**: Centralized state management for sandbox files
- Handles streaming updates with throttling
- Manages file collection and preview state
- Automatically switches between code and preview tabs

### 4. React Integration

- **`useSandbox()`** hook: Provides sandbox state to React components
- **`SandpackPreviewer`**: Enhanced component with streaming indicators
- Automatic tab switching based on streaming state

## How It Works

1. **Stream Reception**: AI response is received through `ChatCompletionStream`
2. **Code Detection**: Content is analyzed using `splitByFirstCodeFence()` to detect code blocks
3. **Streaming Start**: When code fence is detected:
   - `SandboxManager.startCodeStreaming()` is called
   - UI switches to code editor tab
   - Streaming indicator appears
4. **Real-time Updates**: As code streams in:
   - `SandboxManager.updateStreamingCode()` is called (throttled to 500ms)
   - Sandpack editor shows live updates
   - Preview is updated in real-time
5. **Completion**: When code fence closes:
   - `SandboxManager.completeCodeStreaming()` is called
   - Final update is sent to sandbox
   - UI switches to preview tab

## Usage Example

```typescript
// In your chat component
const sandboxState = useSandbox();
const stream = ChatCompletionStream.fromReadableStream(response.body);

stream
  .on('content', (delta, content) => {
    // Detect code blocks
    const parts = splitByFirstCodeFence(content);
    const codeBlock = parts.find(part => 
      part.type === 'first-code-fence' || 
      part.type === 'first-code-fence-generating'
    );
    
    if (codeBlock) {
      // Start or update streaming
      if (codeBlock.type === 'first-code-fence-generating') {
        sandboxState.sandboxManager.updateStreamingCode(
          codeBlock.language,
          codeBlock.filename.name,
          codeBlock.content
        );
      } else {
        sandboxState.sandboxManager.completeCodeStreaming(
          codeBlock.language,
          codeBlock.filename.name,
          codeBlock.content
        );
      }
    }
  });
```

## Features

- **Real-time streaming**: Code appears as it's generated
- **Automatic tab switching**: Shows code during generation, preview when complete
- **Multi-file support**: Handles HTML, CSS, JS, and more
- **Throttled updates**: Prevents overwhelming the sandbox API
- **Visual indicators**: Shows streaming status and animations
- **Template detection**: Automatically detects React, Vue, vanilla JS, etc.

## API Endpoints

### POST `/api/sandbox`

Accepts either legacy fragment format or new files format:

```json
{
  "files": {
    "/index.html": { "code": "<!DOCTYPE html>..." },
    "/styles.css": { "code": "body { ... }" },
    "/script.js": { "code": "console.log('hello');" }
  },
  "previewId": "optional-existing-id"
}
```

Returns:
```json
{
  "url": "/previews/[id]/index.html",
  "id": "preview-id",
  "status": "success"
}
```

## Configuration

- **Throttle delay**: 500ms (configurable in SandboxManager)
- **Auto-run**: Disabled during streaming
- **Recompile mode**: "delayed" during streaming, "immediate" when complete 