import React, { useEffect, useState } from 'react';
import { Member } from '@/context/CollageContext';

type Slot = {
  id: string;
  d: string;
  transform?: string;
  isCenter: boolean;
  // Bounding box for positioning images within this hex cell
  bbox: { x: number; y: number; width: number; height: number };
};

const hexagonSvgModules = import.meta.glob<string>('./hexagon/*.svg', { as: 'raw' });

type ViewBox = { width: number; height: number };

function parseViewBox(svg: SVGSVGElement | null | undefined): ViewBox {
  const vb = svg?.getAttribute('viewBox');
  if (!vb) return { width: 595.3, height: 936 };
  const parts = vb.split(/\s+/).map(Number);
  if (parts.length >= 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
    return { width: parts[2], height: parts[3] };
  }
  return { width: 595.3, height: 936 };
}

function applyMatrix(m: DOMMatrix | SVGMatrix, x: number, y: number) {
  // DOMMatrix: a b c d e f
  const a = (m as any).a ?? 1;
  const b = (m as any).b ?? 0;
  const c = (m as any).c ?? 0;
  const d = (m as any).d ?? 1;
  const e = (m as any).e ?? 0;
  const f = (m as any).f ?? 0;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

function bboxFromTransformedRect(bb: DOMRect, ctm: DOMMatrix | SVGMatrix | null) {
  if (!ctm) {
    return { x: bb.x, y: bb.y, width: bb.width, height: bb.height, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 };
  }
  const p1 = applyMatrix(ctm, bb.x, bb.y);
  const p2 = applyMatrix(ctm, bb.x + bb.width, bb.y);
  const p3 = applyMatrix(ctm, bb.x, bb.y + bb.height);
  const p4 = applyMatrix(ctm, bb.x + bb.width, bb.y + bb.height);
  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function extractSlotsFromSvg(doc: Document): { slots: Slot[]; viewBox: ViewBox } | null {
  const svg = doc.querySelector('svg') as unknown as SVGSVGElement | null;
  const viewBox = parseViewBox(svg);

  const polygons = Array.from(doc.querySelectorAll('polygon'));
  if (polygons.length > 0) {
    const raw: Array<{
      id: string;
      d: string;
      transform?: string;
      pointCount: number;
      cx: number;
      cy: number;
      bbox: { x: number; y: number; width: number; height: number };
    }> = [];
    polygons.forEach((poly) => {
      const points = poly.getAttribute('points');
      if (!points) return;
      const coords = points.trim().split(/[\s,]+/).map(Number);
      if (coords.length < 6) return;

      let sumX = 0, sumY = 0, n = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i];
        const y = coords[i + 1];
        sumX += x;
        sumY += y;
        n++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      const cx = n > 0 ? sumX / n : 0;
      const cy = n > 0 ? sumY / n : 0;
      const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

      const parts: string[] = ['M', String(coords[0]), String(coords[1])];
      for (let i = 2; i < coords.length; i += 2) {
        parts.push('L', String(coords[i]), String(coords[i + 1]));
      }
      parts.push('Z');

      raw.push({
        id: `slot-${raw.length}`,
        d: parts.join(' '),
        transform: poly.getAttribute('transform') ?? undefined,
        pointCount: coords.length / 2,
        cx,
        cy,
        bbox,
      });
    });

    if (raw.length === 0) return null;

    const maxPoints = Math.max(...raw.map((r) => r.pointCount));
    const centerSlots = raw.filter((r) => r.pointCount === maxPoints && r.pointCount > 15);
    const borderSlots = raw.filter((r) => !(r.pointCount === maxPoints && r.pointCount > 15));

    const centerX = viewBox.width / 2;
    const centerY = viewBox.height / 2;
    const sortedBorder = [...borderSlots].sort((a, b) => {
      const angleA = Math.atan2(a.cy - centerY, a.cx - centerX);
      const angleB = Math.atan2(b.cy - centerY, b.cx - centerX);
      const normA = ((angleA + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
      const normB = ((angleB + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
      return normA - normB;
    });

    const slots: Slot[] = [
      ...centerSlots.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: true, bbox: s.bbox })),
      ...sortedBorder.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: false, bbox: s.bbox })),
    ];
    return { slots, viewBox };
  }

  // Fallback for path-based templates (e.g. PDF-exported SVGs like 21.svg, 40.svg)
  const paths = Array.from(doc.querySelectorAll('path')).filter((p) => {
    // Skip obvious non-slot content such as text outlines (the "21" label, etc.)
    if (p.getAttribute('aria-label')) return false;

    const fillAttr = (p.getAttribute('fill') || '').trim().toLowerCase();
    const styleAttr = (p.getAttribute('style') || '').trim().toLowerCase();

    // Treat paths as "non-slots" only if they are explicitly set to fill: none
    const isExplicitNone =
      fillAttr === 'none' ||
      styleAttr.includes('fill:none');

    // All other paths (including ones with fill defined only in style) are treated as slots
    return !isExplicitNone;
  });
  if (paths.length === 0 || typeof document === 'undefined') return null;

  const ns = 'http://www.w3.org/2000/svg';
  const measureSvg = document.createElementNS(ns, 'svg');
  measureSvg.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
  measureSvg.style.position = 'absolute';
  measureSvg.style.left = '-10000px';
  measureSvg.style.top = '-10000px';
  measureSvg.style.width = '0';
  measureSvg.style.height = '0';
  measureSvg.style.visibility = 'hidden';
  document.body.appendChild(measureSvg);

  try {
    type RawPathSlot = {
      id: string;
      d: string;
      transform?: string;
      pointCount: number;
      cx: number;
      cy: number;
      bbox: { x: number; y: number; width: number; height: number };
      area: number;
    };

    const raw = paths
      .map<RawPathSlot | null>((p, idx) => {
        const d = p.getAttribute('d') || '';
        if (!d) return null;
        const transform = p.getAttribute('transform') ?? undefined;
        const clone = document.createElementNS(ns, 'path');
        clone.setAttribute('d', d);
        if (transform) clone.setAttribute('transform', transform);
        measureSvg.appendChild(clone);

        let bb: DOMRect;
        try {
          bb = clone.getBBox();
        } catch {
          measureSvg.removeChild(clone);
          return null;
        }
        const ctm = clone.getCTM();
        const tbb = bboxFromTransformedRect(bb, ctm);
        measureSvg.removeChild(clone);

        if (!Number.isFinite(tbb.width) || !Number.isFinite(tbb.height) || tbb.width <= 0 || tbb.height <= 0) {
          return null;
        }
        const approxPointCount = Math.max(6, (d.match(/[ML]/gi)?.length ?? 0));
        const result: RawPathSlot = {
          id: `slot-${idx}`,
          d,
          transform,
          pointCount: approxPointCount,
          cx: tbb.cx,
          cy: tbb.cy,
          bbox: { x: tbb.x, y: tbb.y, width: tbb.width, height: tbb.height },
          area: tbb.width * tbb.height,
        };
        return result;
      })
      .filter((r): r is RawPathSlot => !!r);

    if (raw.length === 0) return null;

    const center = raw.reduce((best, cur) => (cur.area > best.area ? cur : best), raw[0]);
    const border = raw.filter((r) => r !== center);

    const centerX = viewBox.width / 2;
    const centerY = viewBox.height / 2;
    const sortedBorder = [...border].sort((a, b) => {
      const angleA = Math.atan2(a.cy - centerY, a.cx - centerX);
      const angleB = Math.atan2(b.cy - centerY, b.cx - centerX);
      const normA = ((angleA + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
      const normB = ((angleB + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
      return normA - normB;
    });

    const slots: Slot[] = [
      { id: center.id, d: center.d, transform: center.transform, isCenter: true, bbox: center.bbox },
      ...sortedBorder.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: false, bbox: s.bbox })),
    ];
    return { slots, viewBox };
  } finally {
    document.body.removeChild(measureSvg);
  }
}

// Same placeholders as square grid: center = female, others alternate male/female (clipped inside hex).
const PLACEHOLDER_FEMALE = '/placeholders/placeholder-female.jpg';
const PLACEHOLDER_MALE = '/placeholders/placeholder-male.jpg';

// Resolve path for glob lookup
function resolveSvgPath(path: string): string | null {
  if (path in hexagonSvgModules) return path;
  const key = Object.keys(hexagonSvgModules).find(
    (k) => k.endsWith(path) || k.includes(path)
  );
  return key ?? null;
}

interface HexagonSvgGridProps {
  memberCount: number;
  svgPath: string;
  previewMember?: Member | null;
  existingMembers?: Member[];
  centerEmptyDefault?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Rendered exactly in the center of the card (over the center hex). */
  emptyCenter?: React.ReactNode;
}

export const HexagonSvgGrid: React.FC<HexagonSvgGridProps> = ({
  memberCount,
  svgPath,
  previewMember,
  existingMembers = [],
  centerEmptyDefault = false,
  size = 'large',
  emptyCenter,
}) => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [viewBox, setViewBox] = useState({ width: 595.3, height: 936 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const key = resolveSvgPath(svgPath);
    if (!key) {
      setError('Template not found');
      setLoading(false);
      return;
    }
    const loader = hexagonSvgModules[key as keyof typeof hexagonSvgModules];
    if (typeof loader !== 'function') {
      setError('Failed to load');
      setLoading(false);
      return;
    }
    (loader as () => Promise<string>)()
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const extracted = extractSlotsFromSvg(doc);
        if (!extracted) {
          setError('No slots found');
          return;
        }
        setViewBox(extracted.viewBox);
        setSlots(extracted.slots);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [svgPath]);

  const { width, height } = viewBox;

  const getPhotoForSlot = (slotIndex: number): string => {
    if (slotIndex === 0) {
      if (previewMember?.photo) return previewMember.photo;
      if (!centerEmptyDefault && existingMembers[0]?.photo) return existingMembers[0].photo;
      return PLACEHOLDER_FEMALE;
    }
    const memberIndex = slotIndex - 1;
    const memberPhoto = existingMembers[memberIndex]?.photo;
    if (memberPhoto) return memberPhoto;
    return slotIndex % 2 === 1 ? PLACEHOLDER_MALE : PLACEHOLDER_FEMALE;
  };

  const cellFormula = isDesktop
    ? 'min(calc((35vw - 16px - 14px) / 8), calc((100vh - 16px - 14px) / 8))'
    : 'min(calc((100vw - 16px - 14px) / 8), calc((100vh - 16px - 14px) / 8))';

  const scale = 0.7; // slightly smaller than square templates

  const containerStyle: React.CSSProperties = {
    width: `calc((${cellFormula} * 8 + 14px) * ${scale})`,
    aspectRatio: `${width} / ${height}`,
    margin: '0 auto',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
        <div className="flex items-center justify-center bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full">
          <p className="text-sm text-muted-foreground p-8">Loading hexagon template...</p>
        </div>
      </div>
    );
  }

  if (error || slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
        <div className="flex items-center justify-center bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full">
          <p className="text-sm text-destructive p-8">{error || 'No slots found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
      <div className="relative bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full">
        <div style={containerStyle}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', width: '100%', height: '100%' }}
          >
            <defs>
              {slots.map((s) => (
                <clipPath key={s.id} id={`hex-clip-${s.id}`} clipPathUnits="userSpaceOnUse">
                  <path d={s.d} transform={s.transform} />
                </clipPath>
              ))}
            </defs>
            <rect width="100%" height="100%" fill="#fafafa" />
            {slots.map((s, slotIndex) => {
              const photo = getPhotoForSlot(slotIndex);
              const { x: bx, y: by, width: bw, height: bh } = s.bbox;
              const imgSize = Math.max(bw, bh);
              const imgX = bx + (bw - imgSize) / 2;
              const imgY = by + (bh - imgSize) / 2;
              return (
                <g key={s.id}>
                  <path
                    d={s.d}
                    transform={s.transform}
                    fill="#00c1f3"
                    fillRule="evenodd"
                    stroke="#231f20"
                    strokeMiterlimit={10}
                  />
                  <image
                    href={photo}
                    x={imgX}
                    y={imgY}
                    width={imgSize}
                    height={imgSize}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#hex-clip-${s.id})`}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {emptyCenter != null && slots[0] && (() => {
          const center = slots[0];
          const { x: cx, y: cy, width: cw, height: ch } = center.bbox;
          const inset = 0.02;
          return (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: `${(cx / width) * 100 + inset * 100}%`,
                top: `${(cy / height) * 100 + inset * 100}%`,
                width: `${(cw / width) * 100 - inset * 200}%`,
                height: `${(ch / height) * 100 - inset * 200}%`,
              }}
            >
              <div className="pointer-events-auto flex flex-col items-center justify-center text-center p-2 w-full h-full overflow-hidden box-border text-xs [&_button]:text-xs [&_button]:py-1.5 [&_button]:px-2 [&_p]:text-xs [&_p]:mb-1">
                {emptyCenter}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default HexagonSvgGrid;