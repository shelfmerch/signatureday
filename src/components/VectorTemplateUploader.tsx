import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Slot = { id: string; d: string; transform?: string };

const DPI = 300;

function buildSvgString(
  slots: Slot[],
  images: Record<string, string>,
  baseFill: string,
  width: number,
  height: number
): string {
  const pathAttrs = (s: Slot) => {
    const t = s.transform ? ` transform="${s.transform}"` : '';
    return `<path d="${s.d}"${t} fill="${baseFill}" fill-rule="evenodd" fill-opacity="1"/>`;
  };
  const clipPathContent = (s: Slot) => {
    const t = s.transform ? ` transform="${s.transform}"` : '';
    return `<path d="${s.d}"${t}/>`;
  };

  const clipDefs = slots
    .map(
      (s) =>
        `<clipPath id="clip-${s.id}" clipPathUnits="userSpaceOnUse">${clipPathContent(s)}</clipPath>`
    )
    .join('\n');

  const pathElements = slots.map((s) => pathAttrs(s)).join('\n');

  const imageElements = slots
    .filter((s) => images[s.id])
    .map(
      (s) =>
        `<image href="${images[s.id]}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${s.id})"/>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>${clipDefs}</defs>
<rect width="100%" height="100%" fill="#fafafa"/>
${pathElements}
${imageElements}
</svg>`;
}

async function svgToPngBlob(svgString: string, width: number, height: number): Promise<Blob> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = DPI / 96;
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          if (b) resolve(b);
          else reject(new Error('Failed to encode PNG'));
        },
        'image/png',
        1
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };
    img.src = url;
  });
}

export const VectorTemplateUploader: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [viewBox, setViewBox] = useState({ width: 595.276, height: 936 });
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/images/hex_1.svg')
      .then((r) => r.text())
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        const vb = svg?.getAttribute('viewBox');
        if (vb) {
          const [,, w, h] = vb.split(/\s+/).map(Number);
          if (!isNaN(w) && !isNaN(h)) setViewBox({ width: w, height: h });
        }
        const list: Slot[] = [];

        // Parse <path> elements
        const paths = Array.from(doc.querySelectorAll('path'));
        paths.forEach((p) => {
          const fill = p.getAttribute('fill');
          if (fill && fill !== 'none') {
            const d = p.getAttribute('d') ?? '';
            if (d) {
              list.push({
                id: `slot-${list.length}`,
                d,
                transform: p.getAttribute('transform') ?? undefined,
              });
            }
          }
        });

        // Parse <polygon> elements (convert points to path d)
        const polygons = Array.from(doc.querySelectorAll('polygon'));
        polygons.forEach((poly) => {
          const points = poly.getAttribute('points');
          if (points) {
            const coords = points.trim().split(/[\s,]+/).map(Number);
            if (coords.length >= 6) {
              const parts: string[] = ['M', String(coords[0]), String(coords[1])];
              for (let i = 2; i < coords.length; i += 2) {
                parts.push('L', String(coords[i]), String(coords[i + 1]));
              }
              parts.push('Z');
              const d = parts.join(' ');
              list.push({
                id: `slot-${list.length}`,
                d,
                transform: poly.getAttribute('transform') ?? undefined,
              });
            }
          }
        });

        setSlots(list);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load template');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const onPick = useCallback((slotId: string) => {
    activeSlotRef.current = slotId;
    inputRef.current?.click();
  }, []);

  const onChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    const file = e.target.files?.[0];
    const slotId = activeSlotRef.current;
    activeSlotRef.current = null;
    if (!file || !slotId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImages((prev) => ({ ...prev, [slotId]: dataUrl }));
      toast.success('Image uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const downloadPng = useCallback(async () => {
    if (slots.length === 0) return;
    const count = Object.keys(images).length;
    if (count === 0) {
      toast.error('Please upload at least one image before downloading.');
      return;
    }
    try {
      const svgStr = buildSvgString(slots, images, '#00c1f3', viewBox.width, viewBox.height);
      const blob = await svgToPngBlob(svgStr, viewBox.width, viewBox.height);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'collage-template.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Template downloaded as PNG');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download');
    }
  }, [slots, images, viewBox]);

  useEffect(() => {
    const handler = () => downloadPng();
    window.addEventListener('grid-template-download', handler);
    return () => window.removeEventListener('grid-template-download', handler);
  }, [downloadPng]);

  const { width, height } = viewBox;
  const aspectRatio = width / height;

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full max-h-[400px] bg-muted/30 rounded-xl" style={{ aspectRatio }}>
        <p className="text-sm text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  if (error || slots.length === 0) {
    return (
      <div className="flex items-center justify-center w-full max-h-[400px] bg-muted/30 rounded-xl" style={{ aspectRatio }}>
        <p className="text-sm text-destructive">{error || 'No slots found'}</p>
      </div>
    );
  }

  return (
    <div className="w-full pointer-events-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-lg overflow-hidden border border-gray-200"
        style={{ maxHeight: 'min(70vh, 400px)' }}
      >
        <defs>
          {slots.map((s) => (
            <clipPath key={s.id} id={`clip-${s.id}`} clipPathUnits="userSpaceOnUse">
              <path d={s.d} transform={s.transform} />
            </clipPath>
          ))}
        </defs>

        <rect width="100%" height="100%" fill="#fafafa" />

        {slots.map((s) => (
          <path
            key={s.id}
            d={s.d}
            transform={s.transform}
            fill="#00c1f3"
            fillRule="evenodd"
            fillOpacity={1}
            className="cursor-pointer hover:fill-[#00a8d4] transition-colors"
            onClick={() => onPick(s.id)}
          />
        ))}

        {slots.map((s) =>
          images[s.id] ? (
            <image
              key={`img-${s.id}`}
              href={images[s.id]}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#clip-${s.id})`}
              style={{ pointerEvents: 'none' }}
            />
          ) : null
        )}
      </svg>

      <p className="mt-2 text-xs text-muted-foreground text-center">
        Click any block to upload an image. {Object.keys(images).length} of {slots.length} filled.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
};

export default VectorTemplateUploader;
