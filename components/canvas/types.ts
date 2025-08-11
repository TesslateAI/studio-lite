import { SandboxFile, SandboxManager } from '@/lib/sandbox-manager';

export interface CanvasScreen {
  id: string;
  name: string;
  prompt: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  selected: boolean;
  type: 'desktop' | 'mobile' | 'tablet';
  locked: boolean;
  visible: boolean;
  loading: boolean;
  files?: Record<string, SandboxFile>;
  error?: string;
  sandboxManager?: SandboxManager;
  streamingContent?: string;
  modelUsed?: string;
}

export interface CanvasState {
  screens: CanvasScreen[];
  selectedScreen: CanvasScreen | null;
  zoom: number;
  canvasPosition: { x: number; y: number };
  isGenerating: boolean;
}

export type ScreenType = 'desktop' | 'mobile' | 'tablet' | 'watch' | 'tv';

export interface ScreenSize {
  width: number;
  height: number;
}

export const SCREEN_SIZES: Record<ScreenType, ScreenSize> = {
  desktop: { width: 1024, height: 768 },
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  watch: { width: 280, height: 280 },
  tv: { width: 1920, height: 1080 }
};