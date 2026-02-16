import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'; // ← import React and a bunch of React hooks/utilities

export type CellImages = Record<string, string>; // ← map each cell "key" → image URL/dataURL
export type CellOffsets = Record<string, { x: number; y: number }>; // ← map each cell "key" → background position offsets in %

type StartEvt = React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>; // ← union type for mouse or touch start events on a div

export interface RenderOptions {                     // ← options for rendering/downloading the final canvas
  cols: number;                                      // ← number of columns in the grid
  rows: number;                                      // ← number of rows in the grid
  base?: number;                                     // ← base px size per cell when not print-targeted (default 100 later)
  desiredGapPx?: number;                             // ← visible gap between cells in device pixels
  scale?: number;                                    // ← manual override for device pixel ratio scaling
  background?: string;                               // ← canvas background color (default white)
  // Optional exact print sizing
  // When provided, the output canvas will be sized to these physical dimensions at the specified DPI.
  // Example: 9.5in x 11.875in at 300 DPI
  targetWidthIn?: number;                            // ← physical width in inches (optional)
  targetHeightIn?: number;                           // ← physical height in inches (optional)
  dpi?: number;                                      // ← DPI to use for print output (default 300)
  draw: (helpers: {                                  // ← caller-provided drawing routine
    drawKey: (key: string, r: number, c: number, rs?: number, cs?: number) => Promise<void>; // ← helper to draw a cell image at row/col with optional row/col spans
    ctx: CanvasRenderingContext2D;                   // ← canvas 2D context
    width: number;                                   // ← canvas width in CSS pixels (post-scale)
    height: number;                                  // ← canvas height in CSS pixels
  }) => Promise<void> | void;                        // ← draw can be sync or async
}

interface GridContextValue {                         // ← everything the context exposes to consumers
  // state
  cellImages: CellImages;                            // ← map of cell → image url/data
  setCellImages: React.Dispatch<React.SetStateAction<CellImages>>; // ← setter for images
  cellOffsets: CellOffsets;                          // ← map of cell → {x%, y%} position
  setCellOffsets: React.Dispatch<React.SetStateAction<CellOffsets>>; // ← setter for offsets
  isDownloading: boolean;                            // ← flag while generating & downloading

  // interactions
  getCellStyle: (key: string) => React.CSSProperties; // ← returns inline styles for a cell’s background
  startDrag: (e: StartEvt, key: string) => void;      // ← begins a drag to reposition background
  handleCellActivate: (key: string) => void;          // ← primary action on cell: open file picker

  // rendering / download
  renderToCanvas: (opts: RenderOptions) => Promise<HTMLCanvasElement>; // ← build canvas from current state + draw callback
  downloadImage: (filename: string, opts: RenderOptions) => Promise<void>; // ← render + export PNG (with optional optimization)
}

const GridContext = createContext<GridContextValue | null>(null); // ← create the React context (nullable until provided)

export const GridProvider: React.FC<{ children: React.ReactNode } & Partial<Pick<RenderOptions, 'base' | 'desiredGapPx' | 'scale' | 'background'>>> = ({ // ← provider props: children plus some optional render defaults (not used below, but typed)
  children,                                           // ← destructure children from props
}) => {
  const [cellImages, setCellImages] = useState<CellImages>({}); // ← store images per cell
  const [cellOffsets, setCellOffsets] = useState<CellOffsets>({}); // ← store background position per cell
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // ← which cell will receive an uploaded file
  const [isDownloading, setIsDownloading] = useState(false); // ← UI flag during download

  const fileInputRef = useRef<HTMLInputElement>(null); // ← hidden <input type="file"> ref to trigger the picker
  const dragRef = useRef<{ key: string | null; startX: number; startY: number; startOffsetX: number; startOffsetY: number; elW: number; elH: number; moved: boolean } | null>(null); // ← mutable drag state (avoids re-renders)
  const rafIdRef = useRef<number | null>(null);        // ← requestAnimationFrame id for throttling state updates
  const pendingOffsetRef = useRef<{ key: string; x: number; y: number } | null>(null); // ← last computed offset waiting to be flushed in rAF

  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => { // ← called when a file is selected
    const file = event.target.files?.[0];              // ← take first file
    if (!file || !selectedKey) return;                 // ← need a file and a target cell
    if (!file.type.startsWith('image/')) return;       // ← only images allowed

    try {
      // No client-side face processing; use the original file as an object URL.
      const url = URL.createObjectURL(file);
      setCellImages(prev => ({ ...prev, [selectedKey]: url })); // ← set image for that cell
    } catch (e) {
      // Fallback: store original file as object URL on error
      const fallbackUrl = URL.createObjectURL(file);   // ← create temporary URL if face crop fails
      setCellImages(prev => ({ ...prev, [selectedKey]: fallbackUrl })); // ← still set the image
    } finally {
      event.target.value = '';                         // ← reset file input (so the same file can be selected again)
      setSelectedKey(null);                            // ← clear selection
    }
  }, [selectedKey, setCellImages]);                    // ← memoize handler; depends on selectedKey

  const getCellStyle = useCallback((key: string) => {  // ← returns CSS styles for a cell
    const image = cellImages[key];                     // ← fetch image for this cell
    if (image) {
      const off = cellOffsets[key] ?? { x: 50, y: 50 }; // ← default center position if not set
      return {
        backgroundImage: `url(${image})`,             // ← show image as background
        backgroundSize: 'cover',                      // ← scale to cover the cell
        backgroundPosition: `${off.x}% ${off.y}%`,    // ← use stored % offsets
        backgroundRepeat: 'no-repeat',                // ← no tiling
      } as React.CSSProperties;
    }
    return {} as React.CSSProperties;                  // ← no style if empty
  }, [cellImages, cellOffsets]);                       // ← recompute if images/offsets change

  const startDrag = useCallback((e: StartEvt, key: string) => { // ← start dragging to reposition background
    if (!cellImages[key]) return;                      // ← ignore if no image
    const isTouch = 'touches' in e;                    // ← detect touch vs mouse
    const point = isTouch ? e.touches[0] : (e as React.MouseEvent); // ← get the coordinate source
    const target = e.currentTarget as HTMLDivElement;  // ← the cell element
    const rect = target.getBoundingClientRect();       // ← measure element to convert px→%
    const current = cellOffsets[key] ?? { x: 50, y: 50 }; // ← current background position

    dragRef.current = {                                // ← initialize drag state
      key,
      startX: point.pageX,                             // ← where pointer started (page coords)
      startY: point.pageY,
      startOffsetX: current.x,                         // ← background position at start
      startOffsetY: current.y,
      elW: rect.width,                                 // ← element width/height for % math
      elH: rect.height,
      moved: false,                                    // ← track whether a drag actually happened
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {  // ← pointer move handler
      if (!dragRef.current) return;                    // ← guard if drag ended
      const p = (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0] : (ev as MouseEvent); // ← normalize pointer
      const dx = (p.pageX - dragRef.current.startX) / dragRef.current.elW * 100; // ← delta X in %
      const dy = (p.pageY - dragRef.current.startY) / dragRef.current.elH * 100; // ← delta Y in %
      let nx = dragRef.current.startOffsetX + dx;      // ← new X%
      let ny = dragRef.current.startOffsetY + dy;      // ← new Y%
      nx = Math.max(0, Math.min(100, nx));             // ← clamp 0–100%
      ny = Math.max(0, Math.min(100, ny));
      dragRef.current.moved = true;                    // ← mark as dragged
      if ((ev as any).cancelable) ev.preventDefault(); // ← prevent page scroll on touch if possible
      const k = dragRef.current.key as string;         // ← cell key
      pendingOffsetRef.current = { key: k, x: nx, y: ny }; // ← store latest offsets to flush in rAF
      if (rafIdRef.current == null) {                  // ← if no rAF scheduled…
        rafIdRef.current = requestAnimationFrame(() => { // ← schedule one frame to batch updates
          const pending = pendingOffsetRef.current;    // ← grab last pending
          if (pending) setCellOffsets(prev => ({ ...prev, [pending.key]: { x: pending.x, y: pending.y } })); // ← commit to state (causes rerender)
          rafIdRef.current = null;                     // ← clear scheduled id
        });
      }
    };

    const onUp = () => {                               // ← pointer up / drag end
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp);
      if (rafIdRef.current != null) {                  // ← cancel any queued frame
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setTimeout(() => {                               // ← defer clearing key so click logic can see moved flag
        if (dragRef.current) dragRef.current = { ...dragRef.current, key: null } as any;
      }, 0);
    };

    window.addEventListener('mousemove', onMove as any, { passive: false }); // ← listen globally to track drag outside element
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [cellImages, cellOffsets]);                       // ← depends on current images/offsets

  const handleCellActivate = useCallback((key: string) => { // ← what happens on cell click/tap
    if (dragRef.current?.moved) {                      // ← if a drag just happened, treat this as drag-end, not a click
      dragRef.current.moved = false;
      return;
    }
    setSelectedKey(key);                               // ← remember which cell to fill
    fileInputRef.current?.click();                     // ← programmatically open file picker
  }, []);                                              // ← stable reference

  // helpers for canvas
  const loadImage = useCallback((src: string) => new Promise<HTMLImageElement>((resolve, reject) => { // ← load <img> from a URL/dataURL
    const img = new Image();
    img.crossOrigin = 'anonymous';                     // ← allow CORS-safe drawing to canvas when server sends proper headers
    img.onload = () => resolve(img);                   // ← resolve once loaded
    img.onerror = reject;                              // ← reject on error
    img.src = src;                                     // ← start loading
  }), []);                                             // ← stable memoized function

  const drawImageCover = useCallback((                 // ← draw an image "like CSS background-size: cover"
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,                                        // ← destination x
    dy: number,                                        // ← destination y
    dw: number,                                        // ← destination width
    dh: number,                                        // ← destination height
  ) => {
    const sRatio = img.width / img.height;             // ← source aspect ratio
    const dRatio = dw / dh;                            // ← destination aspect ratio
    let sx = 0, sy = 0, sw = img.width, sh = img.height; // ← source crop rect defaults to full image
    if (sRatio > dRatio) {                             // ← source is wider than dest: crop left/right
      sh = img.height;
      sw = sh * dRatio;
      sx = (img.width - sw) / 2;                       // ← center crop horizontally
    } else {                                           // ← source is taller/narrower: crop top/bottom
      sw = img.width;
      sh = sw / dRatio;
      sy = (img.height - sh) / 2;                      // ← center crop vertically
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); // ← draw cropped -> destination box
  }, []);                                              // ← memoized

  const renderToCanvas = useCallback(async ({ cols, rows, base = 100, desiredGapPx = 4, scale, background = '#ffffff', targetWidthIn, targetHeightIn, dpi = 300, draw }: RenderOptions) => { // ← main render routine
    // Determine target pixel dimensions
    const usingInches = typeof targetWidthIn === 'number' && typeof targetHeightIn === 'number' && targetWidthIn! > 0 && targetHeightIn! > 0; // ← true if print sizing provided
    const widthPx = usingInches ? Math.round((targetWidthIn as number) * dpi) : Math.round(cols * base);  // ← canvas width in pixels
    const heightPx = usingInches ? Math.round((targetHeightIn as number) * dpi) : Math.round(rows * base); // ← canvas height in pixels

    // Support non-square cells when using explicit inches
    const baseX = widthPx / cols;                      // ← effective cell width
    const baseY = heightPx / rows;                     // ← effective cell height

    // If targeting physical size, do not scale by device pixel ratio, keep exact pixel dimensions
    const deviceScale = usingInches ? 1 : (scale ?? Math.min(4, Math.max(2, (window.devicePixelRatio || 1)))); // ← clamp DPR to [2,4] unless inches mode (then 1)

    const canvas = document.createElement('canvas');   // ← make a canvas
    canvas.width = Math.round(widthPx * deviceScale);  // ← internal bitmap width
    canvas.height = Math.round(heightPx * deviceScale); // ← internal bitmap height
    const ctx = canvas.getContext('2d');               // ← 2D context
    if (!ctx) throw new Error('Canvas not supported'); // ← guard if unsupported

    ctx.scale(deviceScale, deviceScale);               // ← scale drawing so coordinates are in CSS pixels
    ctx.imageSmoothingEnabled = true;                  // ← enable smoothing
    try { (ctx as any).imageSmoothingQuality = 'high'; } catch {} // ← request high quality if supported; ignore if not

    ctx.fillStyle = background;                        // ← set background color
    ctx.fillRect(0, 0, widthPx, heightPx);             // ← paint background

    const drawKey = async (key: string, r: number, c: number, rs = 1, cs = 1) => { // ← helper to draw one cell’s image (with row/col spans)
      const src = cellImages[key];                     // ← image source for that cell key
      if (!src) return;                                // ← nothing to draw if missing
      const img = await loadImage(src);                // ← ensure loaded image element
      const gap = desiredGapPx / deviceScale;          // ← convert gap to CSS pixel space
      const leftGap = c === 0 ? 0 : gap / 2;           // ← split gap half-left unless at left edge
      const rightGap = (c + cs) === cols ? 0 : gap / 2; // ← split gap half-right unless at right edge
      const topGap = r === 0 ? 0 : gap / 2;            // ← split gap half-top unless first row
      const bottomGap = (r + rs) === rows ? 0 : gap / 2; // ← split gap half-bottom unless last row
      const dx = Math.round(c * baseX + leftGap);      // ← destination x with gap
      const dy = Math.round(r * baseY + topGap);       // ← destination y with gap
      const dw = Math.round(cs * baseX - (leftGap + rightGap)); // ← destination width minus gap
      const dh = Math.round(rs * baseY - (topGap + bottomGap)); // ← destination height minus gap
      drawImageCover(ctx, img, dx, dy, dw, dh);        // ← draw image cropped to cover the destination rect
    };

    await draw({ drawKey, ctx, width: widthPx, height: heightPx }); // ← let caller lay out the grid using drawKey

    return canvas;                                     // ← give back the finished canvas
  }, [cellImages, loadImage, drawImageCover]);         // ← depends on current images + helpers

  const downloadImage = useCallback(async (filename: string, opts: RenderOptions) => { // ← render and trigger a PNG download
    setIsDownloading(true);                            // ← set busy flag
    try {
      const canvas = await renderToCanvas(opts);       // ← build the canvas
      const rawBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); // ← encode PNG
      if (!rawBlob) throw new Error('Failed to encode PNG'); // ← guard

      // Attempt lossless optimization with OxiPNG (browser-friendly @jsquash/oxipng)
      let finalBlob: Blob = rawBlob;                   // ← start with unoptimized
      try {
        const mod: any = await import(/* @vite-ignore */ '@jsquash/oxipng'); // ← dynamic import of oxipng
        const oxipngFn: any = mod?.oxipng ?? mod?.default; // ← find the function export
        const u8 = new Uint8Array(await rawBlob.arrayBuffer()); // ← get bytes to pass to optimizer
        console.info('[OxiPNG] Attempting lossless optimization...');
        if (typeof oxipngFn !== 'function') {
          console.info('[OxiPNG] Loaded module but no callable function was found; skipping optimization.');
          throw new Error('oxipng not a function');   // ← force catch branch to keep original
        }
        const optimized: Uint8Array = await oxipngFn(u8, { level: 6 }); // ← run optimizer (level 6 is moderate/high)
        if (optimized && optimized.byteLength > 0) {  // ← if output produced
          const candidate = new Blob([optimized as BlobPart], { type: 'image/png' }); // ← rewrap as Blob
          if (candidate.size < rawBlob.size) {        // ← keep only if smaller
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
        console.info('[OxiPNG] Optimization skipped due to error:', optErr); // ← just log and proceed
      }

      const url = URL.createObjectURL(finalBlob);     // ← create a downloadable object URL
      const link = document.createElement('a');       // ← make a temporary anchor
      link.href = url;                                 // ← point to the Blob
      link.download = filename;                        // ← suggest filename
      document.body.appendChild(link);                 // ← attach to DOM (required in some browsers)
      link.click();                                    // ← programmatic click to start download
      document.body.removeChild(link);                 // ← clean up
      URL.revokeObjectURL(url);                        // ← release memory
    } finally {
      setIsDownloading(false);                         // ← clear busy flag even if errors
    }
  }, [renderToCanvas]);                                // ← depends on renderer

  const value: GridContextValue = useMemo(() => ({     // ← memoize the context value to avoid needless re-renders
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
  }), [cellImages, cellOffsets, isDownloading, getCellStyle, startDrag, handleCellActivate, renderToCanvas, downloadImage]); // ← recompute only when these change

  return (                                             // ← render provider
    <GridContext.Provider value={value}>               // ← make context available to children
      <input                                          // ← hidden file input used for uploads
        ref={fileInputRef}                            // ← hook up ref so we can .click() it
        type="file"                                   // ← file picker
        accept="image/*"                              // ← images only
        onChange={onFileChange}                       // ← when a file is chosen
        className="hidden"                            // ← visually hidden (Tailwind)
      />
      {children}                                      // ← render whatever is inside provider
    </GridContext.Provider>
  );
};

export const useGrid = () => {                         // ← consumer hook for the context
  const ctx = useContext(GridContext);                 // ← grab the context
  if (!ctx) throw new Error('useGrid must be used within a GridProvider'); // ← enforce usage inside provider
  return ctx;                                          // ← expose the context to components
};
