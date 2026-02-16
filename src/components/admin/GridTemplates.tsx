
import { useCallback } from 'react';
import { Canvas as FabricCanvas, Polygon, Circle, Rect } from 'fabric';

export type GridType = 'hexagonal' | 'square' | 'center-focus';

export interface GridCell {
  shape: any;
  image: any;
  index: number;
  centerX: number;
  centerY: number;
  size: number;
  type: GridType;
  isCenter?: boolean;
}

// Helper to fit an image to a cell's current geometry
export function fitImageToCell(img: any, cell: GridCell) {
  // Create clip path based on cell type and current geometry
  let clipPath;
  const cellCenter = cell.shape.getCenterPoint ? cell.shape.getCenterPoint() : { x: cell.centerX, y: cell.centerY };
  const cellWidth = cell.shape.getScaledWidth ? cell.shape.getScaledWidth() : cell.size * 2;
  const cellHeight = cell.shape.getScaledHeight ? cell.shape.getScaledHeight() : cell.size * 2;

  if (cell.type === 'hexagonal') {
    const points = [];
    const hexSize = cellWidth / 2;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push({
        x: hexSize * Math.cos(angle),
        y: hexSize * Math.sin(angle)
      });
    }
    clipPath = new Polygon(points, {
      left: cellCenter.x,
      top: cellCenter.y,
      originX: 'center',
      originY: 'center',
      absolutePositioned: true
    });
  } else if (cell.type === 'center-focus') {
    clipPath = new Circle({
      radius: cellWidth / 2,
      left: cellCenter.x,
      top: cellCenter.y,
      originX: 'center',
      originY: 'center',
      absolutePositioned: true
    });
  } else {
    clipPath = new Rect({
      width: cellWidth,
      height: cellHeight,
      left: cellCenter.x,
      top: cellCenter.y,
      originX: 'center',
      originY: 'center',
      absolutePositioned: true
    });
  }

  // Calculate scale based on cell type
  let scale;
  if (cell.type === 'hexagonal') {
    scale = Math.max(
      (cellWidth * 1.2) / img.width,
      (cellHeight * 1.2) / img.height
    );
  } else if (cell.type === 'center-focus') {
    scale = Math.max(
      cellWidth / img.width,
      cellHeight / img.height
    ) * 1.2;
  } else {
    scale = Math.max(
      cellWidth / img.width,
      cellHeight / img.height
    ) * 1.2;
  }

  // Apply settings
  img.set({
    left: cellCenter.x,
    top: cellCenter.y,
    originX: 'center',
    originY: 'center',
    clipPath: clipPath,
    scaleX: scale,
    scaleY: scale,
    selectable: false,
    hasControls: false,
    hasBorders: false,
    evented: false,
    hoverCursor: 'pointer',
    lockRotation: true,
    lockScalingFlip: true,
    lockSkewingX: true,
    lockSkewingY: true,
    lockRotationControl: true,
    centeredScaling: true,
    centeredRotation: true,
  });

  if (img.setControlsVisibility) {
    img.setControlsVisibility({ mtr: false });
  }
}

export const useGridTemplates = () => {
  const createHexagonalGrid = useCallback((canvas: FabricCanvas, memberCount: number = 7) => {
    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Calculate sizes based on member count
    const largeHexSize = Math.min(canvasWidth, canvasHeight) / 6;
    const smallHexSize = largeHexSize / 2;
    const gap = 4;
    const cells: GridCell[] = [];

    // Helper to create a hexagon
    function makeHex(cx: number, cy: number, size: number, isCenter: boolean = false) {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points.push({
          x: size * Math.cos(angle),
          y: size * Math.sin(angle)
        });
      }
      return new Polygon(points, {
        left: cx,
        top: cy,
        fill: 'rgba(200, 200, 200, 0.1)',
        stroke: isCenter ? 'hsl(280, 100%, 50%)' : 'hsl(280, 100%, 60%)',
        strokeWidth: isCenter ? 3 : 1.5,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      });
    }

    // Center large hexagon (index 0)
    cells.push({
      shape: makeHex(centerX, centerY, largeHexSize, true),
      image: null,
      index: 0,
      centerX: centerX,
      centerY: centerY,
      size: largeHexSize,
      type: 'hexagonal',
      isCenter: true
    });

    // Surrounding hexagons
    const surroundingCount = memberCount - 1;
    if (surroundingCount > 0) {
      // First ring: 6 hexagons max
      const firstRingCount = Math.min(surroundingCount, 6);
      for (let i = 0; i < firstRingCount; i++) {
        const angle = (Math.PI / 3) * i;
        const dist = largeHexSize + smallHexSize + gap;
        const cx = centerX + dist * Math.cos(angle);
        const cy = centerY + dist * Math.sin(angle);
        
        cells.push({
          shape: makeHex(cx, cy, smallHexSize),
          image: null,
          index: i + 1,
          centerX: cx,
          centerY: cy,
          size: smallHexSize,
          type: 'hexagonal'
        });
      }

      // Second ring if needed
      if (surroundingCount > 6) {
        const secondRingCount = Math.min(surroundingCount - 6, 12);
        for (let i = 0; i < secondRingCount; i++) {
          const angle = (Math.PI / 6) * i;
          const dist = largeHexSize + smallHexSize * 2 + gap * 2;
          const cx = centerX + dist * Math.cos(angle);
          const cy = centerY + dist * Math.sin(angle);
          
          cells.push({
            shape: makeHex(cx, cy, smallHexSize * 0.8),
            image: null,
            index: i + 7,
            centerX: cx,
            centerY: cy,
            size: smallHexSize * 0.8,
            type: 'hexagonal'
          });
        }
      }
    }

    return cells;
  }, []);

  const createSquareGrid = useCallback((canvas: FabricCanvas, memberCount: number = 9) => {
    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Calculate sizes
    const largeCellSize = Math.min(canvasWidth, canvasHeight) / 5;
    const smallCellSize = largeCellSize / 2;
    const gap = 4;
    const cells: GridCell[] = [];

    // Helper to create a square
    function makeSquare(cx: number, cy: number, size: number, isCenter: boolean = false) {
      return new Rect({
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        fill: 'rgba(200, 200, 200, 0.1)',
        stroke: isCenter ? 'hsl(280, 100%, 50%)' : 'hsl(280, 100%, 60%)',
        strokeWidth: isCenter ? 3 : 1.5,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
      });
    }

    // Center large square (index 0)
    cells.push({
      shape: makeSquare(centerX, centerY, largeCellSize, true),
      image: null,
      index: 0,
      centerX: centerX,
      centerY: centerY,
      size: largeCellSize,
      type: 'square',
      isCenter: true
    });

    // Surrounding squares in a grid pattern
    const surroundingCount = memberCount - 1;
    if (surroundingCount > 0) {
      const positions = [
        // First ring (8 positions around center)
        { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
        // Second ring (16 positions)
        { x: -2, y: -2 }, { x: -1, y: -2 }, { x: 0, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -2 },
        { x: -2, y: -1 }, { x: 2, y: -1 },
        { x: -2, y: 0 }, { x: 2, y: 0 },
        { x: -2, y: 1 }, { x: 2, y: 1 },
        { x: -2, y: 2 }, { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }
      ];

      for (let i = 0; i < Math.min(surroundingCount, positions.length); i++) {
        const pos = positions[i];
        const distance = largeCellSize / 2 + smallCellSize / 2 + gap;
        const cx = centerX + pos.x * distance;
        const cy = centerY + pos.y * distance;
        
        cells.push({
          shape: makeSquare(cx, cy, smallCellSize),
          image: null,
          index: i + 1,
          centerX: cx,
          centerY: cy,
          size: smallCellSize,
          type: 'square'
        });
      }
    }

    return cells;
  }, []);

  const createCenterFocusGrid = useCallback((canvas: FabricCanvas, memberCount: number = 9) => {
    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Calculate sizes
    const largeCellSize = Math.min(canvasWidth, canvasHeight) / 6;
    const smallCellSize = largeCellSize / 2;
    const cells: GridCell[] = [];

    // Helper to create a circle
    function makeCircle(cx: number, cy: number, radius: number, isCenter: boolean = false) {
      return new Circle({
        left: cx - radius,
        top: cy - radius,
        radius: radius,
        fill: 'rgba(200, 200, 200, 0.1)',
        stroke: isCenter ? 'hsl(280, 100%, 50%)' : 'hsl(280, 100%, 60%)',
        strokeWidth: isCenter ? 3 : 1.5,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
      });
    }

    // Center large circle (index 0)
    cells.push({
      shape: makeCircle(centerX, centerY, largeCellSize, true),
      image: null,
      index: 0,
      centerX: centerX,
      centerY: centerY,
      size: largeCellSize,
      type: 'center-focus',
      isCenter: true
    });

    // Surrounding circles
    const surroundingCount = memberCount - 1;
    if (surroundingCount > 0) {
      // First ring
      const firstRingCount = Math.min(surroundingCount, 8);
      const firstRingRadius = largeCellSize + smallCellSize + 20;
      
      for (let i = 0; i < firstRingCount; i++) {
        const angle = (2 * Math.PI * i) / firstRingCount;
        const cx = centerX + firstRingRadius * Math.cos(angle);
        const cy = centerY + firstRingRadius * Math.sin(angle);
        
        cells.push({
          shape: makeCircle(cx, cy, smallCellSize),
          image: null,
          index: i + 1,
          centerX: cx,
          centerY: cy,
          size: smallCellSize,
          type: 'center-focus'
        });
      }

      // Second ring if needed
      if (surroundingCount > 8) {
        const secondRingCount = Math.min(surroundingCount - 8, 12);
        const secondRingRadius = largeCellSize + smallCellSize * 2 + 40;
        
        for (let i = 0; i < secondRingCount; i++) {
          const angle = (2 * Math.PI * i) / secondRingCount;
          const cx = centerX + secondRingRadius * Math.cos(angle);
          const cy = centerY + secondRingRadius * Math.sin(angle);
          
          cells.push({
            shape: makeCircle(cx, cy, smallCellSize * 0.8),
            image: null,
            index: i + 9,
            centerX: cx,
            centerY: cy,
            size: smallCellSize * 0.8,
            type: 'center-focus'
          });
        }
      }
    }

    return cells;
  }, []);

  return {
    createHexagonalGrid,
    createSquareGrid,
    createCenterFocusGrid
  };
};