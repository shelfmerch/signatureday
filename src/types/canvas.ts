export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'upload';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  content: string;
  style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
    letterSpacing?: number;
    lineHeight?: number;
    shadow?: {
      x: number;
      y: number;
      blur: number;
      color: string;
    };
    outline?: {
      width: number;
      color: string;
    };
    gradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      direction?: number;
    };
    curve?: {
      // If fitToWidth is false, use radius directly. If true, radius is derived from element width and sweepAngle
      radius?: number; // pixels
      direction?: 'up' | 'down'; // visual orientation
      startAngleDeg?: number; // shifts the arc along angle space (-180..180)
      sweepAngleDeg?: number; // total angle the text spans (10..360)
      fitToWidth?: boolean; // derive radius so arc length ~= text width
      reverse?: boolean; // flip orientation of glyphs along path
      baselineOffset?: number; // px offset to move arc center vertically within the bounding box
    };
  };
  metadata?: {
    originalFile?: File;
    uploadDate?: Date;
    tags?: string[];
  };
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedElements: string[];
  zoomLevel: number;
  canvasSize: { width: number; height: number };
  viewport: { x: number; y: number };
}

export interface CanvasHistory {
  states: CanvasState[];
  currentIndex: number;
}
