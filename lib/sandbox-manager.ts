import { FragmentSchema } from './schema';
import { ExecutionResultWeb } from './types';
import { determineFilePath, getFileExtension } from './code-detection';
import { createThrottledFunction } from './stream-processing';

export interface SandboxFile {
  code: string;
  active?: boolean;
  hidden?: boolean;
}

export interface SandboxState {
  files: Record<string, SandboxFile>;
  template: string;
  isStreaming: boolean;
  isShowingCodeViewer: boolean;
  activeTab: 'code' | 'preview';
  currentPreviewId: string | null;
  error?: string;
}

export class SandboxManager {
  private state: SandboxState = {
    files: {},
    template: 'static',
    isStreaming: false,
    isShowingCodeViewer: false,
    activeTab: 'preview',
    currentPreviewId: null,
  };

  private listeners: ((state: SandboxState) => void)[] = [];

  constructor() {
    // No need for API URL or throttled updates
  }

  subscribe(listener: (state: SandboxState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): SandboxState {
    return { ...this.state };
  }

  // Start streaming a new code block
  startCodeStreaming(language: string, filename: string | null) {
    const filePath = determineFilePath(language, filename);
    
    this.state = {
      ...this.state,
      files: {
        [filePath]: { code: '', active: true },
      },
      isStreaming: true,
      isShowingCodeViewer: true,
      activeTab: 'code',
      currentPreviewId: null, // Reset preview ID for new code block
      template: this.detectTemplate(language),
    };
    
    this.notifyListeners();
  }

  // Update streaming code content
  updateStreamingCode(language: string, filename: string | null, code: string) {
    const filePath = determineFilePath(language, filename);
    
    this.state = {
      ...this.state,
      files: {
        ...this.state.files,
        [filePath]: { 
          ...this.state.files[filePath],
          code,
        },
      },
    };
    
    this.notifyListeners();
  }

  // Complete code streaming
  completeCodeStreaming(language: string, filename: string | null, code: string) {
    const filePath = determineFilePath(language, filename);
    
    this.state = {
      ...this.state,
      files: {
        ...this.state.files,
        [filePath]: { 
          ...this.state.files[filePath],
          code,
        },
      },
      isStreaming: false,
      activeTab: 'preview', // Switch to preview on completion
    };
    
    this.notifyListeners();
  }

  // Add a complete file at once
  addFile(filePath: string, code: string, active: boolean = false) {
    this.state = {
      ...this.state,
      files: {
        ...this.state.files,
        [filePath]: { code, active },
      },
    };
    
    this.notifyListeners();
  }

  // Clear all files
  clear() {
    this.state = {
      files: {},
      template: 'static',
      isStreaming: false,
      isShowingCodeViewer: false,
      activeTab: 'preview',
      currentPreviewId: null,
      error: undefined,
    };
    
    this.notifyListeners();
  }

  // Get the main file code (for fragment)
  private getMainFileCode(): string {
    const mainFile = this.getMainFilePath();
    return this.state.files[mainFile]?.code || '';
  }

  // Get the main file path
  private getMainFilePath(): string {
    const filePaths = Object.keys(this.state.files);
    
    // Priority order for main file
    const priorityPaths = [
      '/index.html',
      '/App.tsx',
      '/App.jsx',
      '/App.js',
      '/script.js',
      '/main.py',
    ];
    
    for (const path of priorityPaths) {
      if (filePaths.includes(path)) {
        return path;
      }
    }
    
    // Return first file if no priority match
    return filePaths[0] || '/index.html';
  }

  // Detect template from language
  private detectTemplate(language: string): string {
    const templateMap: Record<string, string> = {
      'html': 'static',
      'css': 'static',
      'javascript': 'vanilla',
      'js': 'vanilla',
      'typescript': 'vanilla-ts',
      'ts': 'vanilla-ts',
      'jsx': 'react',
      'tsx': 'react-ts',
      'vue': 'vue',
      'svelte': 'svelte',
      'python': 'python',
      'py': 'python',
    };

    return templateMap[language.toLowerCase()] || 'static';
  }

  // Set active tab
  setActiveTab(tab: 'code' | 'preview') {
    this.state = {
      ...this.state,
      activeTab: tab,
    };
    this.notifyListeners();
  }

  // Toggle code viewer visibility
  toggleCodeViewer() {
    this.state = {
      ...this.state,
      isShowingCodeViewer: !this.state.isShowingCodeViewer,
    };
    this.notifyListeners();
  }
} 