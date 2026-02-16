import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
const PLACEHOLDER_IMAGES = ['/placeholders/placeholder-male.jpg', '/placeholders/placeholder-female.jpg'];

const hashKey = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};


export type CellImages = Record<string, string>;
export type CellOffsets = Record<string, { x: number; y: number }>;

type StartEvt = React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>;

export interface RenderOptions {
  cols: number;
  rows: number;
  base?: number; // px size for a single grid cell at 1x
  desiredGapPx?: number; // visible gap between cells in the final output (device pixels)
  scale?: number; // override device scale
  background?: string; // canvas background, defaults to white
  // Optional exact print sizing
  // When provided, the output canvas will be sized to these physical dimensions at the specified DPI.
  // Example: 9.5in x 11.875in at 300 DPI
  targetWidthIn?: number;
  targetHeightIn?: number;
  dpi?: number; // dots per inch for print-targeted output (default 300)
  draw: (helpers: {
    drawKey: (key: string, r: number, c: number, rs?: number, cs?: number) => Promise<void>;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
  }) => Promise<void> | void;
}

interface GridContextValue {
  // state
  cellImages: CellImages;
  setCellImages: React.Dispatch<React.SetStateAction<CellImages>>;
  cellOffsets: CellOffsets;
  setCellOffsets: React.Dispatch<React.SetStateAction<CellOffsets>>;
  isDownloading: boolean;

  // interactions
  getCellStyle: (key: string) => React.CSSProperties;
  startDrag: (e: StartEvt, key: string) => void;
  handleCellActivate: (key: string) => void;

  // rendering / download
  renderToCanvas: (opts: RenderOptions) => Promise<HTMLCanvasElement>;
  downloadImage: (filename: string, opts: RenderOptions) => Promise<void>;
}

const GridContext = createContext<GridContextValue | null>(null);

export const GridProvider: React.FC<{ children: React.ReactNode } & Partial<Pick<RenderOptions, 'base' | 'desiredGapPx' | 'scale' | 'background'>>> = ({
  children,
}) => {
  const [cellImages, setCellImages] = useState<CellImages>({});
  const [cellOffsets, setCellOffsets] = useState<CellOffsets>({});
  const [isDownloading, setIsDownloading] = useState(false);

  // File input and upload functionality removed - cells are now read-only

  const getCellStyle = useCallback((key: string) => {
    const image = cellImages[key];
    if (image) {
      const off = cellOffsets[key] ?? { x: 50, y: 50 };
      return {
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: `${off.x}% ${off.y}%`,
        backgroundRepeat: 'no-repeat',
      } as React.CSSProperties;
    }
    const placeholder = PLACEHOLDER_IMAGES[hashKey(key) % PLACEHOLDER_IMAGES.length];
    return {
      backgroundImage: `url(${placeholder})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      filter: 'grayscale(15%)',
    } as React.CSSProperties;
  }, [cellImages, cellOffsets]);

  const startDrag = useCallback((e: StartEvt, key: string) => {
    // Drag functionality removed - cells are now read-only
    return;
  }, []);

  const handleCellActivate = useCallback((key: string) => {
    // Click functionality removed - cells are now read-only
    return;
  }, []);

  // helpers for canvas
  const loadImage = useCallback((src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  }), []);

  const drawImageCover = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => {
    const sRatio = img.width / img.height;
    const dRatio = dw / dh;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (sRatio > dRatio) {
      sh = img.height;
      sw = sh * dRatio;
      sx = (img.width - sw) / 2;
    } else {
      sw = img.width;
      sh = sw / dRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }, []);

  const renderToCanvas = useCallback(async ({ cols, rows, base = 100, desiredGapPx = 4, scale, background = '#ffffff', targetWidthIn, targetHeightIn, dpi = 300, draw }: RenderOptions) => {
    // Determine target pixel dimensions
    const usingInches = typeof targetWidthIn === 'number' && typeof targetHeightIn === 'number' && targetWidthIn! > 0 && targetHeightIn! > 0;
    const widthPx = usingInches ? Math.round((targetWidthIn as number) * dpi) : Math.round(cols * base);
    const heightPx = usingInches ? Math.round((targetHeightIn as number) * dpi) : Math.round(rows * base);

    // Support non-square cells when using explicit inches
    const baseX = widthPx / cols;
    const baseY = heightPx / rows;

    // If targeting physical size, do not scale by device pixel ratio, keep exact pixel dimensions
    const deviceScale = usingInches ? 1 : (scale ?? Math.min(4, Math.max(2, (window.devicePixelRatio || 1))));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthPx * deviceScale);
    canvas.height = Math.round(heightPx * deviceScale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.scale(deviceScale, deviceScale);
    ctx.imageSmoothingEnabled = true;
    try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const drawKey = async (key: string, r: number, c: number, rs = 1, cs = 1) => {
      const src = cellImages[key];
      if (!src) return;
      const img = await loadImage(src);
      const gap = desiredGapPx / deviceScale;
      const leftGap = c === 0 ? 0 : gap / 2;
      const rightGap = (c + cs) === cols ? 0 : gap / 2;
      const topGap = r === 0 ? 0 : gap / 2;
      const bottomGap = (r + rs) === rows ? 0 : gap / 2;
      const dx = Math.round(c * baseX + leftGap);
      const dy = Math.round(r * baseY + topGap);
      const dw = Math.round(cs * baseX - (leftGap + rightGap));
      const dh = Math.round(rs * baseY - (topGap + bottomGap));
      drawImageCover(ctx, img, dx, dy, dw, dh);
    };

    await draw({ drawKey, ctx, width: widthPx, height: heightPx });

    return canvas;
  }, [cellImages, loadImage, drawImageCover]);

  const downloadImage = useCallback(async (filename: string, opts: RenderOptions) => {
    setIsDownloading(true);
    try {
      // Enforce default print size for all template downloads unless explicitly overridden
      const finalOpts: RenderOptions = {
        ...opts,
        targetWidthIn: opts.targetWidthIn ?? 8,
        targetHeightIn: opts.targetHeightIn ?? 12.5,
        dpi: opts.dpi ?? 300,
      };
      const canvas = await renderToCanvas(finalOpts);
      const rawBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!rawBlob) throw new Error('Failed to encode PNG');

      // Attempt lossless optimization with OxiPNG (browser-friendly @jsquash/oxipng)
      let finalBlob: Blob = rawBlob;
      try {
        const mod: any = await import(/* @vite-ignore */ '@jsquash/oxipng');
        const oxipngFn: any = mod?.oxipng ?? mod?.default;
        const u8 = new Uint8Array(await rawBlob.arrayBuffer());
        console.info('[OxiPNG] Attempting lossless optimization...');
        if (typeof oxipngFn !== 'function') {
          console.info('[OxiPNG] Loaded module but no callable function was found; skipping optimization.');
          throw new Error('oxipng not a function');
        }
        const optimized: Uint8Array = await oxipngFn(u8, { level: 6 });
        if (optimized && optimized.byteLength > 0) {
          const candidate = new Blob([optimized as BlobPart], { type: 'image/png' });
          if (candidate.size < rawBlob.size) {
            finalBlob = candidate;
            // Test log: show optimization gains
            try {
              const beforeKB = (rawBlob.size / 1024).toFixed(1);
              const afterKB = (finalBlob.size / 1024).toFixed(1);
              const saved = rawBlob.size > 0 ? (((rawBlob.size - finalBlob.size) / rawBlob.size) * 100).toFixed(1) : '0';
              console.info(`[OxiPNG] Optimized PNG: ${beforeKB}KB -> ${afterKB}KB (${saved}% saved)`);
            } catch {}
          } else {
            console.info('[OxiPNG] No savings achieved; keeping original PNG.');
          }
        } else {
          console.info('[OxiPNG] Optimization returned empty output; using original PNG.');
        }
      } catch (optErr) {
        // Fallback to the original blob if optimization fails or lib missing
        console.info('[OxiPNG] Optimization skipped due to error:', optErr);
      }

      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [renderToCanvas]);

  const value: GridContextValue = useMemo(() => ({
    cellImages,
    setCellImages,
    cellOffsets,
    setCellOffsets,
    isDownloading,
    getCellStyle,
    startDrag,
    handleCellActivate,
    renderToCanvas,
    downloadImage,
  }), [cellImages, cellOffsets, isDownloading, getCellStyle, startDrag, handleCellActivate, renderToCanvas, downloadImage]);

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = () => {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('useGrid must be used within a GridProvider');
  return ctx;
};
