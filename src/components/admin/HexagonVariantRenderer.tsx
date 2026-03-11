import React, { useRef, useEffect } from 'react';
import { Order } from '@/types/admin';
import { GridVariant } from '@/utils/gridVariantGenerator';

interface HexagonVariantRendererProps {
    order: Order;
    variant: GridVariant;
    onRendered: (variantId: string, dataUrl: string) => void;
}

// SVG modules for hexagon templates
const hexagonSvgModules = import.meta.glob<string>('@/components/hexagon/*.svg', { as: 'raw' });

// Resolve path for glob lookup
function resolveSvgPath(n: number): string | null {
    const patterns = [
        `./hexagon/${n}.svg`,
        `/src/components/hexagon/${n}.svg`,
    ];
    for (const k of Object.keys(hexagonSvgModules)) {
        if (k.includes(`/${n}.svg`)) return k;
    }
    return null;
}

// Placeholders
const PLACEHOLDER_FEMALE = '/placeholders/placeholder-female.jpg';
const PLACEHOLDER_MALE = '/placeholders/placeholder-male.jpg';

type Slot = {
    id: string;
    d: string;
    transform?: string;
    isCenter: boolean;
    bbox: { x: number; y: number; width: number; height: number };
    cx: number;
    cy: number;
};

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

// Parse hexagon SVG and extract slots
async function parseHexagonSvg(memberCount: number): Promise<{ slots: Slot[]; viewBox: { width: number; height: number } } | null> {
    const key = resolveSvgPath(memberCount);
    if (!key) {
        console.error(`[HexagonVariantRenderer] No SVG found for ${memberCount} members`);
        return null;
    }

    const loader = hexagonSvgModules[key as keyof typeof hexagonSvgModules];
    if (typeof loader !== 'function') {
        console.error(`[HexagonVariantRenderer] Failed to load SVG for ${memberCount} members`);
        return null;
    }

    try {
        const text = await (loader as () => Promise<string>)();
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg') as unknown as SVGSVGElement | null;
        const viewBox = parseViewBox(svg);

        const raw: Array<{
            id: string;
            d: string;
            transform?: string;
            pointCount: number;
            cx: number;
            cy: number;
            bbox: { x: number; y: number; width: number; height: number };
            area: number;
        }> = [];

        const polygons = Array.from(doc.querySelectorAll('polygon'));
        if (polygons.length > 0) {
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
                    area: bbox.width * bbox.height,
                });
            });
        } else {
            // Fallback for path-based templates (e.g. 21.svg, 40.svg)
            const paths = Array.from(doc.querySelectorAll('path')).filter((p) => {
                // Skip obvious non-slot content such as text outlines (the "21" label, etc.)
                if (p.getAttribute('aria-label')) return false;

                const fillAttr = (p.getAttribute('fill') || '').trim().toLowerCase();
                const styleAttr = (p.getAttribute('style') || '').trim().toLowerCase();

                const isExplicitNone =
                    fillAttr === 'none' ||
                    styleAttr.includes('fill:none');

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
                paths.forEach((p) => {
                    const d = p.getAttribute('d') || '';
                    if (!d) return;
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
                        return;
                    }
                    const ctm = clone.getCTM();
                    const tbb = bboxFromTransformedRect(bb, ctm);
                    measureSvg.removeChild(clone);

                    const bbox = { x: tbb.x, y: tbb.y, width: tbb.width, height: tbb.height };
                    if (!(Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0)) return;
                    const approxPointCount = Math.max(6, (d.match(/[ML]/gi)?.length ?? 0));
                    raw.push({
                        id: `slot-${raw.length}`,
                        d,
                        transform,
                        pointCount: approxPointCount,
                        cx: tbb.cx,
                        cy: tbb.cy,
                        bbox,
                        area: bbox.width * bbox.height,
                    });
                });
            } finally {
                document.body.removeChild(measureSvg);
            }
        }

        if (raw.length === 0) return null;

        const hasPolygonCenter = raw.some((r) => r.pointCount > 15);
        let centerCandidates: typeof raw = [];
        let borderCandidates: typeof raw = [];
        if (hasPolygonCenter) {
            const maxPoints = Math.max(...raw.map((r) => r.pointCount));
            centerCandidates = raw.filter((r) => r.pointCount === maxPoints && r.pointCount > 15);
            borderCandidates = raw.filter((r) => !(r.pointCount === maxPoints && r.pointCount > 15));
        } else {
            const center = raw.reduce((best, cur) => (cur.area > best.area ? cur : best), raw[0]);
            centerCandidates = [center];
            borderCandidates = raw.filter((r) => r !== center);
        }

        const centerX = viewBox.width / 2;
        const centerY = viewBox.height / 2;
        const sortedBorder = [...borderCandidates].sort((a, b) => {
            const angleA = Math.atan2(a.cy - centerY, a.cx - centerX);
            const angleB = Math.atan2(b.cy - centerY, b.cx - centerX);
            const normA = ((angleA + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
            const normB = ((angleB + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
            return normA - normB;
        });

        const slots: Slot[] = [
            ...centerCandidates.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: true, bbox: s.bbox, cx: s.cx, cy: s.cy })),
            ...sortedBorder.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: false, bbox: s.bbox, cx: s.cx, cy: s.cy })),
        ];

        return { slots, viewBox };
    } catch (err) {
        console.error('[HexagonVariantRenderer] Failed to parse SVG:', err);
        return null;
    }
}

// Load image with CORS handling
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
}

// -------- PNG DPI embedding (pHYs chunk @ 300 DPI) --------
function embedPngDpi300(dataUrl: string): string {
    try {
        const bytes = dataURLToUint8(dataUrl);
        const result = insertPhysChunk(bytes, 300);
        return uint8ToDataURL(result);
    } catch (e) {
        console.warn('[HexagonVariantRenderer] Failed to embed DPI:', e);
        return dataUrl;
    }
}

function dataURLToUint8(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function uint8ToDataURL(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:image/png;base64,' + btoa(bin);
}

function insertPhysChunk(pngBytes: Uint8Array, dpi: number): Uint8Array {
    const ppu = Math.round(dpi * 39.3701);
    const type = new TextEncoder().encode('pHYs');
    const data = new Uint8Array(9);
    const dv = new DataView(data.buffer);
    dv.setUint32(0, ppu);
    dv.setUint32(4, ppu);
    data[8] = 1;
    const len = uint32ToBytes(9);
    const crc = uint32ToBytes(crc32Concat(type, data));
    const ihdrEnd = 8 + 4 + 4 + 13 + 4;
    const before = pngBytes.slice(0, ihdrEnd);
    const after = pngBytes.slice(ihdrEnd);
    const result = new Uint8Array(before.length + 4 + 4 + 9 + 4 + after.length);
    let p = 0;
    result.set(before, p); p += before.length;
    result.set(len, p); p += 4;
    result.set(type, p); p += 4;
    result.set(data, p); p += 9;
    result.set(crc, p); p += 4;
    result.set(after, p);
    return result;
}

function uint32ToBytes(val: number): Uint8Array {
    const arr = new Uint8Array(4);
    new DataView(arr.buffer).setUint32(0, val);
    return arr;
}

let _crcTable: Uint32Array | null = null;
function crc32Table(): Uint32Array {
    if (_crcTable) return _crcTable;
    _crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        _crcTable[n] = c;
    }
    return _crcTable;
}

function crc32Concat(type: Uint8Array, data: Uint8Array): number {
    const t = crc32Table();
    let c = 0xffffffff;
    for (let i = 0; i < type.length; i++) c = t[(c ^ type[i]) & 0xff] ^ (c >>> 8);
    for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

export const HexagonVariantRenderer: React.FC<HexagonVariantRendererProps> = ({
    order,
    variant,
    onRendered,
}) => {
    const hasRenderedRef = useRef(false);

    useEffect(() => {
        if (hasRenderedRef.current) return;
        hasRenderedRef.current = true;

        const generateVariantImage = async () => {
            console.log(`[HexagonVariantRenderer] Rendering variant for ${variant.centerMember.name}`);

            try {
                // Parse the hexagon SVG
                const result = await parseHexagonSvg(order.members.length);
                if (!result) {
                    console.error('[HexagonVariantRenderer] Failed to parse hexagon SVG');
                    onRendered(variant.id, '');
                    return;
                }

                const { slots, viewBox } = result;

                // Create canvas with 300 DPI (8.5 x 11.5 inches => 2550 x 3450 px)
                const TARGET_W_PX = 2550;
                const TARGET_H_PX = 3450;
                const canvas = document.createElement('canvas');
                canvas.width = TARGET_W_PX;
                canvas.height = TARGET_H_PX;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('[HexagonVariantRenderer] Failed to get canvas context');
                    onRendered(variant.id, '');
                    return;
                }

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, TARGET_W_PX, TARGET_H_PX);

                // Calculate scaling to fit viewBox proportionally within the 2550 x 3450 area
                // Leave a small margin (e.g., 20px) to avoid touching the edges
                const margin = 20;
                const availableW = TARGET_W_PX - (margin * 2);
                const availableH = TARGET_H_PX - (margin * 2);

                const scaleW = availableW / viewBox.width;
                const scaleH = availableH / viewBox.height;
                const finalScale = Math.min(scaleW, scaleH);

                // Center the grid on the canvas
                const offsetX = (TARGET_W_PX - (viewBox.width * finalScale)) / 2;
                const offsetY = (TARGET_H_PX - (viewBox.height * finalScale)) / 2;

                ctx.translate(offsetX, offsetY);
                ctx.scale(finalScale, finalScale);

                // Get photo for slot
                const getPhotoForSlot = (slotIndex: number): string => {
                    if (slotIndex === 0) {
                        // Center slot - use the variant's center member
                        return variant.centerMember.photo || PLACEHOLDER_FEMALE;
                    }
                    // Border slots: index 1..n map to variant.members 
                    // Skip the center member in variant.members (index 0)
                    const memberIndex = slotIndex - 1;
                    const member = variant.members[memberIndex];
                    if (member?.photo) return member.photo;
                    return slotIndex % 2 === 1 ? PLACEHOLDER_MALE : PLACEHOLDER_FEMALE;
                };

                // Draw each slot
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    const photoUrl = getPhotoForSlot(i);

                    // Create path for clipping
                    const path = new Path2D(slot.d);

                    // Draw the slot background
                    ctx.save();
                    ctx.fillStyle = '#00c1f3';
                    ctx.strokeStyle = '#231f20';
                    ctx.lineWidth = 1;
                    ctx.fill(path);
                    ctx.stroke(path);
                    ctx.restore();

                    // Try to load and draw the image
                    try {
                        const img = await loadImage(photoUrl);

                        ctx.save();
                        ctx.clip(path);

                        // Calculate image dimensions to cover the slot
                        const { x: bx, y: by, width: bw, height: bh } = slot.bbox;
                        const imgSize = Math.max(bw, bh);
                        const imgX = bx + (bw - imgSize) / 2;
                        const imgY = by + (bh - imgSize) / 2;

                        // Draw the image to cover the slot
                        const aspectRatio = img.width / img.height;
                        let drawWidth = imgSize;
                        let drawHeight = imgSize;
                        let drawX = imgX;
                        let drawY = imgY;

                        if (aspectRatio > 1) {
                            drawWidth = imgSize * aspectRatio;
                            drawX = imgX - (drawWidth - imgSize) / 2;
                        } else {
                            drawHeight = imgSize / aspectRatio;
                            drawY = imgY - (drawHeight - imgSize) / 2;
                        }

                        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                        ctx.restore();
                    } catch (err) {
                        console.warn(`[HexagonVariantRenderer] Failed to load image for slot ${i}:`, err);
                        // Keep the cyan background as fallback
                    }
                }

                // Draw the center member's name at the right bottom corner (reversed/mirrored)
                if (variant.centerMember?.name) {
                    ctx.save();
                    // Reset any transforms from the hexagon scaling/centering
                    ctx.setTransform(1, 0, 0, 1, 0, 0);

                    // Move to bottom right with a small padding
                    ctx.translate(canvas.width - 30, canvas.height - 30);
                    // Mirror horizontally for the "reverse" effect
                    ctx.scale(-1, 1);

                    // Text configuration
                    ctx.font = 'bold 40px Arial';
                    ctx.fillStyle = '#000000';

                    // Draw white outline for better visibility against varying backgrounds
                    ctx.lineWidth = 8;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#ffffff';

                    // In a -1 scaled X-axis, 'left' alignment makes the text expand towards the visual left.
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';

                    ctx.strokeText(variant.centerMember.name, 0, 0);
                    ctx.fillText(variant.centerMember.name, 0, 0);

                    ctx.restore();
                }

                // Export to PNG with 300 DPI
                const dataUrl = canvas.toDataURL('image/png');
                const dpiDataUrl = embedPngDpi300(dataUrl);

                console.log(`[HexagonVariantRenderer] Successfully rendered variant for ${variant.centerMember.name}`);
                onRendered(variant.id, dpiDataUrl);
            } catch (err) {
                console.error('[HexagonVariantRenderer] Error rendering variant:', err);
                onRendered(variant.id, '');
            }
        };

        generateVariantImage();
    }, [order, variant, onRendered]);

    // Hidden component - no visible UI
    return null;
};

export default HexagonVariantRenderer;
