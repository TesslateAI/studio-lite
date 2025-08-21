import { CanvasScreen } from '../types';

export interface LayoutOptions {
  spacing: number;
  columns: number;
  startX: number;
  startY: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  spacing: 50,
  columns: 3,
  startX: 100,
  startY: 100,
};

/**
 * Calculate the optimal grid layout for screens
 */
export function calculateAutoLayout(
  screens: CanvasScreen[],
  options: Partial<LayoutOptions> = {}
): CanvasScreen[] {
  const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const { spacing, columns, startX, startY } = layoutOptions;

  // Group screens by their generation time (if they were created close together)
  // For now, we'll just layout all screens in a grid
  
  return screens.map((screen, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    // Calculate position based on grid
    const x = startX + col * (screen.size.width + spacing);
    const y = startY + row * (screen.size.height + spacing);
    
    return {
      ...screen,
      position: { x, y }
    };
  });
}

/**
 * Calculate positions for a batch of new screens to avoid overlap
 */
export function calculateBatchLayout(
  existingScreens: CanvasScreen[],
  newScreenCount: number,
  screenSize: { width: number; height: number },
  options: Partial<LayoutOptions> = {}
): Array<{ x: number; y: number }> {
  const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const { spacing, columns } = layoutOptions;
  
  // Find the rightmost and bottommost positions of existing screens
  let maxX = 100;
  let maxY = 100;
  let rightmostBottom = 100;
  
  if (existingScreens.length > 0) {
    existingScreens.forEach(screen => {
      const screenRight = screen.position.x + screen.size.width;
      const screenBottom = screen.position.y + screen.size.height;
      if (screenRight >= maxX) {
        maxX = screenRight;
        rightmostBottom = screenBottom;
      }
      maxY = Math.max(maxY, screenBottom);
    });
  }
  
  // Calculate starting position for new screens
  // If there are existing screens, start to the right of the rightmost screen
  // If that would be too far right (>2000px), start on a new row
  let startX = existingScreens.length > 0 ? maxX + spacing * 2 : 100;
  let startY = 100;
  
  if (startX > 2000) {
    // Start on a new row below all existing screens
    startX = 100;
    startY = maxY + spacing * 2;
  } else if (existingScreens.length > 0) {
    // Align with the top of the rightmost column
    startY = Math.min(100, rightmostBottom - screenSize.height);
  }
  
  const positions: Array<{ x: number; y: number }> = [];
  
  for (let i = 0; i < newScreenCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    positions.push({
      x: startX + col * (screenSize.width + spacing),
      y: startY + row * (screenSize.height + spacing)
    });
  }
  
  return positions;
}

/**
 * Smart layout that groups related screens together
 */
export function smartAutoLayout(screens: CanvasScreen[]): CanvasScreen[] {
  if (screens.length === 0) return screens;
  
  const spacing = 50;
  const groupSpacing = 150; // Extra space between groups
  
  // Group screens by their type and similarity
  const groups: Map<string, CanvasScreen[]> = new Map();
  
  screens.forEach(screen => {
    // Group by type for now, could be enhanced with more sophisticated grouping
    const groupKey = screen.type;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(screen);
  });
  
  const layoutScreens: CanvasScreen[] = [];
  let currentX = 100;
  let currentY = 100;
  let maxHeightInRow = 0;
  
  // Layout each group
  groups.forEach((groupScreens, groupKey) => {
    const columns = Math.min(3, groupScreens.length);
    
    groupScreens.forEach((screen, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      if (col === 0 && index > 0) {
        // Start new row
        currentY += maxHeightInRow + spacing;
        maxHeightInRow = 0;
      }
      
      const x = currentX + col * (screen.size.width + spacing);
      const y = currentY + row * (screen.size.height + spacing);
      
      layoutScreens.push({
        ...screen,
        position: { x, y }
      });
      
      maxHeightInRow = Math.max(maxHeightInRow, screen.size.height);
    });
    
    // Move to next group position
    const groupWidth = Math.min(columns, groupScreens.length) * 
      (groupScreens[0]?.size.width || 400) + (columns - 1) * spacing;
    currentX += groupWidth + groupSpacing;
    
    // Reset to new row if too far right
    if (currentX > 2000) {
      currentX = 100;
      currentY += maxHeightInRow + groupSpacing;
      maxHeightInRow = 0;
    }
  });
  
  return layoutScreens;
}

/**
 * Find a non-overlapping position for a new screen
 */
export function findNonOverlappingPosition(
  existingScreens: CanvasScreen[],
  newScreenSize: { width: number; height: number },
  preferredPosition?: { x: number; y: number }
): { x: number; y: number } {
  const spacing = 50;
  let position = preferredPosition || { x: 100, y: 100 };
  
  // Check if preferred position causes overlap
  const hasOverlap = (pos: { x: number; y: number }) => {
    return existingScreens.some(screen => {
      const horizontalOverlap = 
        pos.x < screen.position.x + screen.size.width + spacing &&
        pos.x + newScreenSize.width + spacing > screen.position.x;
      const verticalOverlap = 
        pos.y < screen.position.y + screen.size.height + spacing &&
        pos.y + newScreenSize.height + spacing > screen.position.y;
      return horizontalOverlap && verticalOverlap;
    });
  };
  
  // If preferred position has overlap, find a new position
  if (hasOverlap(position)) {
    // Try positions in a grid pattern until we find a free spot
    const step = 100;
    let found = false;
    
    for (let attemptY = 100; attemptY < 3000 && !found; attemptY += step) {
      for (let attemptX = 100; attemptX < 3000 && !found; attemptX += step) {
        const testPos = { x: attemptX, y: attemptY };
        if (!hasOverlap(testPos)) {
          position = testPos;
          found = true;
        }
      }
    }
  }
  
  return position;
}