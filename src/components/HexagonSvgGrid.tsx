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
  const sizeStyles = {
    small: { maxH: 'min(65vh,450px)', minH: 180 },
    medium: { maxH: 'min(75vh,550px)', minH: 220 },
    large: { maxH: '100%', minH: 240 },
    xlarge: { maxH: '100%', minH: 280 },
  }[size];

  const [slots, setSlots] = useState<Slot[]>([]);
  const [viewBox, setViewBox] = useState({ width: 595.3, height: 936 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const svg = doc.querySelector('svg');
        const vb = svg?.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/\s+/).map(Number);
          if (parts.length >= 4) setViewBox({ width: parts[2], height: parts[3] });
        }

        const raw: Array<{
          id: string;
          d: string;
          transform?: string;
          pointCount: number;
          cx: number;
          cy: number;
          bbox: { x: number; y: number; width: number; height: number };
        }> = [];
        const vbParts = (svg?.getAttribute('viewBox') || '0 0 595.3 936').split(/\s+/).map(Number);
        const vw = vbParts[2] || 595.3;
        const vh = vbParts[3] || 936;

        // Parse polygons only (hexagon SVGs use polygon)
        const polygons = Array.from(doc.querySelectorAll('polygon'));
        polygons.forEach((poly) => {
          const points = poly.getAttribute('points');
          if (points) {
            const coords = points.trim().split(/[\s,]+/).map(Number);
            if (coords.length >= 6) {
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
              const bbox = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
              };
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
            }
          }
        });

        // Center = polygon with most points (the large central hexagon)
        const maxPoints = Math.max(...raw.map((r) => r.pointCount));
        const centerSlots = raw.filter((r) => r.pointCount === maxPoints && r.pointCount > 15);
        const borderSlots = raw.filter((r) => !(r.pointCount === maxPoints && r.pointCount > 15));

        // Sort border slots clockwise: top (1-3) → right (4-8) → bottom (9-11) → left (12-14)
        const centerX = vw / 2;
        const centerY = vh / 2;
        const sortedBorder = [...borderSlots].sort((a, b) => {
          const angleA = Math.atan2(a.cy - centerY, a.cx - centerX);
          const angleB = Math.atan2(b.cy - centerY, b.cx - centerX);
          const normA = ((angleA + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
          const normB = ((angleB + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
          return normA - normB;
        });

        const ordered: Slot[] = [
          ...centerSlots.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: true, bbox: s.bbox })),
          ...sortedBorder.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: false, bbox: s.bbox })),
        ];

        setSlots(ordered);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [svgPath]);

  const { width, height } = viewBox;

  // Match square grid logic: 1st member is in center AND in first border slot.
  // Square: center = member 0, border slots = members 0..15 (so member 0 in center + first small box).
  // Hex: slot 0 (center) = member 0 (or preview), slots 1..16 (border) = members 0..15.
  const getPhotoForSlot = (slotIndex: number): string => {
    if (slotIndex === 0) {
      if (previewMember?.photo) return previewMember.photo;
      if (!centerEmptyDefault && existingMembers[0]?.photo) return existingMembers[0].photo;
      return PLACEHOLDER_FEMALE;
    }
    // Border slots 1..16 = members 0..15 (same as square: first member in center and in first border slot)
    const memberIndex = slotIndex - 1;
    const memberPhoto = existingMembers[memberIndex]?.photo;
    if (memberPhoto) return memberPhoto;
    return slotIndex % 2 === 1 ? PLACEHOLDER_MALE : PLACEHOLDER_FEMALE;
  };

  // Fit container (GridBoard/Editor/JoinGroup): match square grid containment approach.
  // Square grid uses viewport-based sizing with --cell/--gap; hex uses flex constraints to fit parent.
  // Key: wrapper and card must not exceed the parent CardContent bounds. Use viewport-based sizing.
  const wrapperClass = 'w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6';
  const cardClass = 'flex flex-col bg-white rounded-xl shadow-2xl p-1 md:p-3 max-w-full overflow-hidden';
  const cardStyle: React.CSSProperties = {
    minHeight: sizeStyles.minH,
  };

  // Calculate viewport-based heights similar to square grid's approach
  const svgContainerStyle: React.CSSProperties = {
    width: '100%',
    height: 'min(60vh, 550px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className={cardClass} style={cardStyle}>
          <div className="flex-1 min-h-0 flex items-center justify-center" style={{ minHeight: 200 }}>
            <p className="text-sm text-muted-foreground">Loading hexagon template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || slots.length === 0) {
    return (
      <div className={wrapperClass}>
        <div className={cardClass} style={cardStyle}>
          <div className="flex-1 min-h-0 flex items-center justify-center" style={{ minHeight: 200 }}>
            <p className="text-sm text-destructive">{error || 'No slots found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className={`${cardClass} relative`} style={cardStyle}>
        {/* Bounded box: SVG scales to fit parent; use viewport-based height like square grid. */}
        <div style={svgContainerStyle}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', width: 'auto', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
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
        {/* Empty state inside the center hex: position/size to match center slot bbox (viewBox %). */}
        {emptyCenter != null && slots[0] && (
          (() => {
            const center = slots[0];
            const { x: cx, y: cy, width: cw, height: ch } = center.bbox;
            const inset = 0.02;
            const leftPct = (cx / width) * 100 + inset * 100;
            const topPct = (cy / height) * 100 + inset * 100;
            const wPct = (cw / width) * 100 - inset * 200;
            const hPct = (ch / height) * 100 - inset * 200;
            return (
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${wPct}%`,
                  height: `${hPct}%`,
                }}
              >
                <div className="pointer-events-auto flex flex-col items-center justify-center text-center p-2 w-full h-full overflow-hidden box-border text-xs [&_button]:text-xs [&_button]:py-1.5 [&_button]:px-2 [&_p]:text-xs [&_p]:mb-1">
                  {emptyCenter}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default HexagonSvgGrid;
