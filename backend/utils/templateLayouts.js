/**
 * Template layouts for server-side rendering (mirrors src/templates/layouts.ts)
 * Each enumerate function yields slot specifications for placing members
 */

/**
 * Enumerate layout for 12-member template
 */
export function enumerate12() {
  const slots = [];
  // Top row (3 cells)
  for (let c = 0; c < 3; c++) {
    slots.push({ kind: 'top', index: c, r: 0, c: 1.5 + c, rspan: 1, cspan: 1 });
  }
  // Left side (3 cells)
  for (let r = 0; r < 3; r++) {
    slots.push({ kind: 'left', index: 3 + r, r: 1.5 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // Right side (3 cells)
  for (let r = 0; r < 3; r++) {
    slots.push({ kind: 'right', index: 6 + r, r: 1.5 + r, c: 5, rspan: 1, cspan: 1 });
  }
  // Bottom row (3 cells)
  for (let c = 0; c < 3; c++) {
    slots.push({ kind: 'bottom', index: 9 + c, r: 5, c: 1.5 + c, rspan: 1, cspan: 1 });
  }
  return { slots, cols: 6, rows: 6 };
}

/**
 * Enumerate layout for 18-member template
 */
export function enumerate18() {
  const slots = [];
  // Top row (4 cells)
  for (let c = 0; c < 4; c++) {
    slots.push({ kind: 'top', index: c, r: 0, c: 1 + c, rspan: 1, cspan: 1 });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'left', index: 4 + r, r: 1 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 4 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'right', index: 9 + r, r: 1 + r, c: 5, rspan: 1, cspan: 1 });
  }
  // Bottom row (4 cells)
  for (let c = 0; c < 4; c++) {
    slots.push({ kind: 'bottom', index: 14 + c, r: 6, c: 1 + c, rspan: 1, cspan: 1 });
  }
  return { slots, cols: 6, rows: 7 };
}

/**
 * Enumerate layout for 19-member template
 */
export function enumerate19() {
  const slots = [];
  // Top row (4 cells)
  for (let c = 0; c < 4; c++) {
    slots.push({ kind: 'top', index: c, r: 0, c: 1 + c, rspan: 1, cspan: 1 });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'left', index: 4 + r, r: 1 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 4 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'right', index: 9 + r, r: 1 + r, c: 5, rspan: 1, cspan: 1 });
  }
  // Bottom row (5 cells)
  for (let c = 0; c < 5; c++) {
    slots.push({ kind: 'bottom', index: 14 + c, r: 6, c: 0.5 + c, rspan: 1, cspan: 1 });
  }
  return { slots, cols: 6, rows: 7 };
}

/**
 * Enumerate layout for 20-member template
 */
export function enumerate20() {
  const slots = [];
  // Top row (5 cells)
  for (let c = 0; c < 5; c++) {
    slots.push({ kind: 'top', index: c, r: 0, c: 1 + c, rspan: 1, cspan: 1 });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'left', index: 5 + r, r: 1 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 5 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'right', index: 10 + r, r: 1 + r, c: 6, rspan: 1, cspan: 1 });
  }
  // Bottom row (5 cells)
  for (let c = 0; c < 5; c++) {
    slots.push({ kind: 'bottom', index: 15 + c, r: 6, c: 1 + c, rspan: 1, cspan: 1 });
  }
  return { slots, cols: 7, rows: 7 };
}

/**
 * Enumerate layout for 33-member template
 */
export function enumerate33() {
  const slots = [];
  // Top row (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'top', index: c, r: 0, c, rspan: 1, cspan: 1 });
  }
  // Left side (4 cells)
  for (let r = 0; r < 4; r++) {
    slots.push({ kind: 'left', index: 8 + r, r: 1 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 6 });
  // Right side (4 cells)
  for (let r = 0; r < 4; r++) {
    slots.push({ kind: 'right', index: 12 + r, r: 1 + r, c: 7, rspan: 1, cspan: 1 });
  }
  // Bottom row (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'bottom', index: 16 + c, r: 5, c, rspan: 1, cspan: 1 });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'bottomExt', index: 24 + c, r: 6, c, rspan: 1, cspan: 1 });
  }
  // Bottom-most (1 cell centered)
  slots.push({ kind: 'bottomMostExt', index: 32, r: 7, c: 3.5, rspan: 1, cspan: 1 });
  return { slots, cols: 8, rows: 8 };
}

/**
 * Enumerate layout for 45-member template
 */
export function enumerate45() {
  const slots = [];
  // Top extension most (8 cells)
  for (let i = 0; i < 8; i++) {
    slots.push({ kind: 'topExtMost', index: 37 + i, r: 0, c: i, rspan: 1, cspan: 1 });
  }
  // Top row (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'top', index: c, r: 1, c, rspan: 1, cspan: 1 });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'left', index: 8 + r, r: 2 + r, c: 0, rspan: 1, cspan: 1 });
  }
  // Center
  slots.push({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    slots.push({ kind: 'right', index: 13 + r, r: 2 + r, c: 7, rspan: 1, cspan: 1 });
  }
  // Bottom row (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'bottom', index: 18 + c, r: 7, c, rspan: 1, cspan: 1 });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    slots.push({ kind: 'bottomExt', index: 26 + c, r: 8, c, rspan: 1, cspan: 1 });
  }
  // Bottom-most extension (3 cells, centered)
  for (let i = 0; i < 3; i++) {
    slots.push({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 2.5 + i, rspan: 1, cspan: 1 });
  }
  return { slots, cols: 8, rows: 10 };
}

/**
 * Get layout for a given member count
 */
export function getLayoutForMemberCount(memberCount) {
  // Map member counts to their enumerate functions
  const layoutMap = {
    12: enumerate12,
    13: enumerate12, // Use 12 layout
    14: enumerate12,
    15: enumerate12,
    16: enumerate18, // Use 18 layout for 16-17
    17: enumerate18,
    18: enumerate18,
    19: enumerate19,
    20: enumerate20,
    21: enumerate20,
    22: enumerate20,
    23: enumerate20,
    33: enumerate33,
    34: enumerate33,
    35: enumerate33,
    45: enumerate45,
  };

  // Find closest matching layout
  if (layoutMap[memberCount]) {
    return layoutMap[memberCount]();
  }

  // Default to 45 for larger groups, or 18 for smaller
  if (memberCount >= 36) {
    return enumerate45();
  } else if (memberCount >= 24) {
    return enumerate33();
  } else if (memberCount >= 19) {
    return enumerate20();
  } else {
    return enumerate18();
  }
}

/**
 * Calculate pixel positions for a layout
 * @param {Object} layout - Layout from enumerate function
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} gap - Gap between cells in pixels
 * @returns {Array} Array of cell positions with x, y, width, height
 */
export function calculateCellPositions(layout, canvasWidth, canvasHeight, gap = 4) {
  const { slots, cols, rows } = layout;
  
  // Calculate cell dimensions
  const cellW = (canvasWidth - (cols + 1) * gap) / cols;
  const cellH = (canvasHeight - (rows + 1) * gap) / rows;

  return slots.map(slot => {
    const rspan = slot.rspan || 1;
    const cspan = slot.cspan || 1;
    
    // Handle fractional column positions (for centered cells)
    const effectiveCol = slot.c;
    const effectiveRow = slot.r;
    
    const x = gap + effectiveCol * (cellW + gap);
    const y = gap + effectiveRow * (cellH + gap);
    const w = cspan * cellW + (cspan - 1) * gap;
    const h = rspan * cellH + (rspan - 1) * gap;

    return {
      ...slot,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h)
    };
  });
}

// ============= HEXAGONAL GRID LAYOUTS =============

/**
 * Generate hexagonal grid layout
 * Creates a honeycomb pattern with center cell being larger
 * @param {number} memberCount - Number of members
 * @returns {Object} Layout with slots array and dimensions
 */
export function getHexagonalLayout(memberCount) {
  const slots = [];
  
  // Hexagonal grid uses a radial arrangement
  // Center cell (index 0) is the large center hexagon
  // Border cells surround it in rings
  
  // Calculate rings needed based on member count
  // Ring 0 = 1 cell (center)
  // Ring 1 = 6 cells
  // Ring 2 = 12 cells
  // Ring 3 = 18 cells, etc.
  // Total cells in n rings = 1 + 6*(1+2+...+n) = 1 + 3*n*(n+1)
  
  let totalCells = 1;
  let rings = 0;
  while (totalCells < memberCount) {
    rings++;
    totalCells = 1 + 3 * rings * (rings + 1);
  }
  
  // Center takes up more space
  const centerSize = 3; // Center spans equivalent of 3x3 cells
  
  // Grid dimensions based on rings
  const gridCols = 2 * rings + centerSize;
  const gridRows = 2 * rings + centerSize;
  
  // Add center slot
  slots.push({
    kind: 'center',
    index: -1,
    r: rings,
    c: rings,
    rspan: centerSize,
    cspan: centerSize
  });
  
  // Add border slots in rings (simplified to grid positions)
  let memberIndex = 0;
  for (let ring = 1; ring <= rings && memberIndex < memberCount - 1; ring++) {
    const cellsInRing = 6 * ring;
    const angleStep = (2 * Math.PI) / cellsInRing;
    
    for (let i = 0; i < cellsInRing && memberIndex < memberCount - 1; i++) {
      const angle = angleStep * i - Math.PI / 2; // Start from top
      const r = rings + centerSize / 2 + Math.sin(angle) * ring * 1.5;
      const c = rings + centerSize / 2 + Math.cos(angle) * ring * 1.5;
      
      slots.push({
        kind: 'border',
        index: memberIndex,
        r: Math.max(0, Math.min(gridRows - 1, r)),
        c: Math.max(0, Math.min(gridCols - 1, c)),
        rspan: 1,
        cspan: 1
      });
      memberIndex++;
    }
  }
  
  return { slots, cols: gridCols, rows: gridRows };
}

/**
 * Calculate hexagonal cell positions
 * Uses a honeycomb arrangement with the center being larger
 */
export function calculateHexagonalCellPositions(memberCount, canvasWidth, canvasHeight, gap = 4) {
  const slots = [];
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Calculate optimal cell size based on member count
  // More members = smaller cells
  const borderCount = memberCount - 1;
  
  // Center cell size (proportional to canvas)
  const centerSize = Math.min(canvasWidth, canvasHeight) * 0.35;
  
  // Border cell size
  const borderSize = Math.min(canvasWidth, canvasHeight) * (borderCount > 30 ? 0.08 : borderCount > 20 ? 0.10 : 0.12);
  
  // Add center slot
  slots.push({
    kind: 'center',
    index: -1,
    x: Math.round(centerX - centerSize / 2),
    y: Math.round(centerY - centerSize / 2),
    width: Math.round(centerSize),
    height: Math.round(centerSize)
  });
  
  // Calculate rings for border cells
  let rings = 1;
  let placed = 0;
  const placements = [];
  
  while (placed < borderCount) {
    const radius = centerSize / 2 + rings * (borderSize + gap);
    const cellsInRing = Math.min(6 * rings, borderCount - placed);
    const angleStep = (2 * Math.PI) / (6 * rings);
    
    for (let i = 0; i < cellsInRing && placed < borderCount; i++) {
      const angle = angleStep * i - Math.PI / 2; // Start from top
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Check bounds
      if (x - borderSize / 2 >= 0 && x + borderSize / 2 <= canvasWidth &&
          y - borderSize / 2 >= 0 && y + borderSize / 2 <= canvasHeight) {
        placements.push({ x, y, ring: rings, angle });
        placed++;
      }
    }
    rings++;
    
    // Safety limit
    if (rings > 10) break;
  }
  
  // Sort placements by angle for consistent ordering
  placements.sort((a, b) => {
    if (a.ring !== b.ring) return a.ring - b.ring;
    return a.angle - b.angle;
  });
  
  // Add border slots
  placements.forEach((p, idx) => {
    slots.push({
      kind: 'border',
      index: idx,
      x: Math.round(p.x - borderSize / 2),
      y: Math.round(p.y - borderSize / 2),
      width: Math.round(borderSize),
      height: Math.round(borderSize)
    });
  });
  
  return slots;
}
