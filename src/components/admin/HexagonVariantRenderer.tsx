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
        const svg = doc.querySelector('svg');

        let viewBox = { width: 595.3, height: 936 };
        const vb = svg?.getAttribute('viewBox');
        if (vb) {
            const parts = vb.split(/\s+/).map(Number);
            if (parts.length >= 4) viewBox = { width: parts[2], height: parts[3] };
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

        // Parse polygons (hexagon SVGs use polygon)
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

        // Sort border slots clockwise
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
            ...centerSlots.map((s) => ({ id: s.id, d: s.d, transform: s.transform, isCenter: true, bbox: s.bbox, cx: s.cx, cy: s.cy })),
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

                // Create canvas with high DPI
                const scale = 2; // 2x for better quality
                const canvas = document.createElement('canvas');
                canvas.width = viewBox.width * scale;
                canvas.height = viewBox.height * scale;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    console.error('[HexagonVariantRenderer] Failed to get canvas context');
                    onRendered(variant.id, '');
                    return;
                }

                // Scale the context for high DPI
                ctx.scale(scale, scale);

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, viewBox.width, viewBox.height);

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
