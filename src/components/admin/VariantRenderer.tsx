import React, { useRef, useEffect } from 'react';
import { Order } from '@/types/admin';
import { GridVariant } from '@/utils/gridVariantGenerator';
import * as faceapi from 'face-api.js';
import {enumerate12, enumerate13, enumerate14, enumerate15, enumerate16, enumerate17, enumerate18, enumerate19, enumerate20, enumerate33, enumerate34, enumerate35, enumerate36, enumerate37, enumerate38, enumerate39, enumerate40, enumerate41, enumerate42, enumerate43, enumerate44, enumerate45, enumerate46, enumerate47, enumerate48, enumerate49, enumerate50, enumerate51, enumerate52, enumerate53, enumerate54, enumerate55, enumerate56, enumerate57, enumerate58, enumerate59, enumerate60, enumerate61, enumerate62, enumerate63, enumerate64, enumerate65, enumerate66, enumerate67, enumerate68, enumerate69, enumerate70, enumerate71, enumerate72, enumerate73, enumerate74, enumerate75, enumerate76, enumerate77, enumerate78, enumerate79, enumerate80, enumerate81, enumerate82, enumerate83, enumerate84, enumerate85, enumerate86, enumerate87, enumerate88, enumerate89, enumerate90, enumerate91, enumerate92, enumerate93, enumerate94, enumerate95, enumerate96 } from '@/templates/layouts';
import * as layouts from '@/templates/layouts';

interface VariantRendererProps {
  order: Order;
  variant: GridVariant;
  onRendered: (variantId: string, dataUrl: string) => void;
  templateKey?: string; // e.g., '45' (future: support others via registry)
}

function cloudinarySafeUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.startsWith('data:')) return url;

  const marker = url.includes('/image/upload/')
    ? '/image/upload/'
    : url.includes('/upload/')
      ? '/upload/'
      : null;
  if (!marker) return url;

  const markerStart = url.indexOf(marker);
  const afterMarker = markerStart + marker.length;
  const nextSlash = url.indexOf('/', afterMarker);
  const firstSegmentAfterMarker = url.slice(afterMarker, nextSlash === -1 ? url.length : nextSlash);

  // Already transformed (any of these in the first segment after /upload/)
  if (/(^|,)(f_|q_|fl_)/.test(firstSegmentAfterMarker)) return url;

  return url.slice(0, afterMarker) + 'f_auto,q_auto/' + url.slice(afterMarker);
}

function cloudinarySecondAttempt(url?: string): string | undefined {
  if (!url) return url;
  const qIndex = url.indexOf('?');
  const base = qIndex >= 0 ? url.slice(0, qIndex) : url;
  const query = qIndex >= 0 ? url.slice(qIndex) : '';

  if (!/\.(heic|heif)$/i.test(base)) return url;
  return base.replace(/\.(heic|heif)$/i, '.jpg') + query;
}

// -------- PNG DPI embedding (pHYs chunk @ 300 DPI) --------
function embedPngDpi300(dataUrl: string): string {
  try {
    const u8 = dataURLToUint8(dataUrl);
    const withPhys = insertPhysChunk(u8, 300);
    return uint8ToDataURL(withPhys);
  } catch {
    // Fallback to original if anything fails
    return dataUrl;
  }
}

function dataURLToUint8(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ToDataURL(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:image/png;base64,${base64}`;
}

function insertPhysChunk(pngBytes: Uint8Array, dpi: number): Uint8Array {
  const PPM = Math.round(dpi / 0.0254); // pixels per meter (300dpi ≈ 11811)
  const signature = pngBytes.slice(0, 8);
  const PNG_SIG = new Uint8Array([137,80,78,71,13,10,26,10]);
  for (let i = 0; i < 8; i++) if (signature[i] !== PNG_SIG[i]) return pngBytes; // not a PNG

  // Walk chunks and insert pHYs right after IHDR
  let pos = 8;
  const out: number[] = [];
  // push signature
  for (let i = 0; i < 8; i++) out.push(PNG_SIG[i]);

  let inserted = false;
  while (pos < pngBytes.length) {
    const length = readUint32(pngBytes, pos); // big-endian
    const type = String.fromCharCode(
      pngBytes[pos + 4],
      pngBytes[pos + 5],
      pngBytes[pos + 6],
      pngBytes[pos + 7]
    );
    const dataStart = pos + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;

    // copy current chunk
    for (let i = pos; i < crcEnd; i++) out.push(pngBytes[i]);

    pos = crcEnd;

    if (!inserted && type === 'IHDR') {
      // Build pHYs chunk
      const physData = new Uint8Array(9);
      writeUint32(physData, 0, PPM);
      writeUint32(physData, 4, PPM);
      physData[8] = 1; // unit: meter

      const typeBytes = new Uint8Array([112, 72, 89, 115]); // 'pHYs'
      const lengthBytes = uint32ToBytes(physData.length);
      const crc = crc32Concat(typeBytes, physData);
      const crcBytes = uint32ToBytes(crc);

      // Append pHYs to output
      for (let b of lengthBytes) out.push(b);
      for (let b of typeBytes) out.push(b);
      for (let b of physData) out.push(b);
      for (let b of crcBytes) out.push(b);
      inserted = true;
    }
  }

  return new Uint8Array(out);
}

function readUint32(arr: Uint8Array, pos: number): number {
  return (arr[pos] << 24) | (arr[pos + 1] << 16) | (arr[pos + 2] << 8) | arr[pos + 3];
}

function writeUint32(arr: Uint8Array, pos: number, val: number) {
  arr[pos] = (val >>> 24) & 0xff;
  arr[pos + 1] = (val >>> 16) & 0xff;
  arr[pos + 2] = (val >>> 8) & 0xff;
  arr[pos + 3] = val & 0xff;
}

function uint32ToBytes(val: number): Uint8Array {
  const b = new Uint8Array(4);
  writeUint32(b, 0, val >>> 0);
  return b;
}

// CRC32 over type+data
function crc32Concat(type: Uint8Array, data: Uint8Array): number {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < type.length; i++) crc = (crc >>> 8) ^ table[(crc ^ type[i]) & 0xff];
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: Uint32Array | null = null;
function crc32Table(): Uint32Array {
  if (_crcTable) return _crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  _crcTable = table;
  return table;
}

export const VariantRenderer: React.FC<VariantRendererProps> = ({
  order,
  variant,
  onRendered,
  templateKey = '45',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateVariantImage = async () => {
      let effectiveKey = templateKey;
      // These are used only in debug logs inside enumerator blocks.
      // (Some of those logs reference `c`/`r` without defining them locally.)
      let c = 0;
      let r = 0;

      try {
        console.log('[VariantRenderer] Rendering variant:', variant.id, 'with center member:', variant.centerMember.name);
        console.log('[VariantRenderer] Center member photo:', {
          hasPhoto: !!variant.centerMember?.photo,
          photoType: variant.centerMember?.photo?.startsWith('data:') ? 'data URL' : 'URL',
          photoLength: variant.centerMember?.photo?.length || 0,
          photoPreview: variant.centerMember?.photo ? (variant.centerMember.photo.startsWith('data:') ? 'data:...' : variant.centerMember.photo.substring(0, 50)) : 'none'
        });

        // 0) Ensure face-api models are loaded (once per session)
        await ensureModelsLoaded();

        // Create canvas at print-equivalent pixels based on template
        const canvas = document.createElement('canvas');
        const DPI = 300;
        // Derive effective template key from the order to match layouts.ts
        const count = order.members.length;
        if (order.gridTemplate === 'square') {
          if (count === 12) effectiveKey = '12';
          else if (count === 13) effectiveKey = '13';
          else if (count === 14) effectiveKey = '14';
          else if (count === 15) effectiveKey = '15';
          else if (count === 16) effectiveKey = '16';
          else if (count === 17) effectiveKey = '17';
          else if (count === 18) effectiveKey = '18';
          else if (count === 19) effectiveKey = '19';
          else if (count === 20) effectiveKey = '20';
          else if (count === 21) effectiveKey = '21';
          else if (count === 22) effectiveKey = '22';
          else if (count === 23) effectiveKey = '23';
          else if (count === 33) effectiveKey = '33';
          else if (count === 45) effectiveKey = '45';
        }
        const is8to19 = effectiveKey === '8' || effectiveKey === '9' || effectiveKey === '10' || effectiveKey === '11' || effectiveKey === '12' || effectiveKey === '13' || effectiveKey === '14' || effectiveKey === '15' || effectiveKey === '16' || effectiveKey === '17' || effectiveKey === '18' || effectiveKey === '19';
        const is20to23 = effectiveKey === '20' || effectiveKey === '21' || effectiveKey === '22' || effectiveKey === '23';
        const is24to34 = effectiveKey === '29' || effectiveKey === '30' || effectiveKey === '31' || effectiveKey === '32' || effectiveKey === '33' || effectiveKey === '34';
        const is37to50 = effectiveKey === '24' || effectiveKey === '25' || effectiveKey === '26' || effectiveKey === '27' || effectiveKey === '28' || effectiveKey === '35' || effectiveKey === '36' || effectiveKey === '37' || effectiveKey === '38' || effectiveKey === '39' || effectiveKey === '40' || effectiveKey === '41' || effectiveKey === '42' || effectiveKey === '43' || effectiveKey === '44' || effectiveKey === '45' || effectiveKey === '46' || effectiveKey === '47' || effectiveKey === '48' || effectiveKey === '49' || effectiveKey === '50';
        const is51to56 = effectiveKey === '51' || effectiveKey === '52' || effectiveKey === '53' || effectiveKey === '54' || effectiveKey === '55' || effectiveKey === '56';
        const is57to74 = effectiveKey === '57' || effectiveKey === '58' || effectiveKey === '59' || effectiveKey === '60' || effectiveKey === '61' || effectiveKey === '62' || effectiveKey === '63' || effectiveKey === '64' || effectiveKey === '65' || effectiveKey === '66' || effectiveKey === '67' || effectiveKey === '68' || effectiveKey === '69' || effectiveKey === '70' || effectiveKey === '71' || effectiveKey === '72' || effectiveKey === '73' || effectiveKey === '74';
        const is75to92 = effectiveKey === '75' || effectiveKey === '76' || effectiveKey === '77' || effectiveKey === '78' || effectiveKey === '79' || effectiveKey === '80' || effectiveKey === '81' || effectiveKey === '82' || effectiveKey === '83' || effectiveKey === '84' || effectiveKey === '85' || effectiveKey === '86' || effectiveKey === '87' || effectiveKey === '88' || effectiveKey === '89' || effectiveKey === '90' || effectiveKey === '91' || effectiveKey === '92';
        const TARGET_W_IN = is37to50 || is8to19 ? 8 : 8.5;
        const TARGET_H_IN = is8to19 ? 13.0 : 13.5;
        const COLS = is51to56 || is57to74 ? 9 : is75to92 ? 11 : is8to19 ? 6 : is20to23 ? 7 : 8;
        const ROWS = is57to74 ? 9 : is75to92 ? 11 : is8to19 || is20to23 ? 7 : 10
        const gap = 4; // align with desiredGapPx used in downloads
        canvas.width = Math.round(TARGET_W_IN * DPI);
        canvas.height = Math.round(TARGET_H_IN * DPI);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        // Improve resampling quality for clearer faces
        (ctx as any).imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Match template structure
        // Compute cell sizes to fully occupy the fixed canvas with gaps
        const cellW = (canvas.width - (COLS + 1) * gap) / COLS;
        const cellH = (canvas.height - (ROWS + 1) * gap) / ROWS;

        const rect = (c: number, r: number, cspan = 1, rspan = 1) => ({
          x: gap + c * (cellW + gap),
          y: gap + r * (cellH + gap),
          w: cspan * cellW + (cspan - 1) * gap,
          h: rspan * cellH + (rspan - 1) * gap,
        });

        const drawCover = async (src: string, c: number, r: number, cspan = 1, rspan = 1) => {
          const { x, y, w, h } = rect(c, r, cspan, rspan);
          return new Promise<void>((resolve) => {
            const safeSrc = cloudinarySafeUrl(src) ?? src;
            let didSecondAttempt = false;

            if (src && safeSrc && safeSrc !== src) {
              console.debug('[VariantRenderer] image RAW/SAFE', {
                at: { c, r },
                raw: src.startsWith('data:') ? 'data:...' : src,
                safe: safeSrc.startsWith('data:') ? 'data:...' : safeSrc,
              });
            }

            const img = new Image();
            
            // Handle data URLs differently - they don't need CORS
            if (safeSrc.startsWith('data:')) {
              img.crossOrigin = undefined;
            } else {
              img.crossOrigin = 'anonymous';
            }
            
            let timeoutId: NodeJS.Timeout | null = null;
            let resolved = false;
            
            const cleanup = () => {
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            };
            
            const drawPlaceholder = () => {
              if (resolved) return;
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = '#9ca3af';
              ctx.font = `${Math.min(12, w / 8)}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('No Image', x + w / 2, y + h / 2);
            };
            
            img.onload = async () => {
              cleanup();
              if (resolved) return;
              
              try {
                // Try face-aware crop first (await detection)
                const { sx, sy, sw, sh } = await getFaceAwareCropAsync(img, w, h);
                ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
                resolved = true;
                resolve();
              } catch (e) {
                // If face detection fails, try to draw the image anyway
                try {
                  ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
                  resolved = true;
                  resolve();
                } catch (drawError) {
                  // If drawing fails, draw a placeholder
                  console.warn(`Failed to draw image at (${c}, ${r}):`, drawError);
                  drawPlaceholder();
                  resolved = true;
                  resolve();
                }
              }
            };
            
            img.onerror = (error) => {
              cleanup();
              if (resolved) return;
              
              // If HEIC/HEIF still fails, try swapping extension to .jpg (still through Cloudinary).
              if (!didSecondAttempt) {
                const second = cloudinarySafeUrl(cloudinarySecondAttempt(src));
                if (second && second !== safeSrc && /\.(heic|heif)(\?|$)/i.test(src)) {
                  didSecondAttempt = true;
                  console.debug('[VariantRenderer] image onError: second attempt (.jpg)', {
                    at: { c, r },
                    raw: src.startsWith('data:') ? 'data:...' : src,
                    safe: safeSrc.startsWith('data:') ? 'data:...' : safeSrc,
                    second,
                    error,
                  });
                  img.src = second;
                  return;
                }
              }

              // Instead of rejecting, draw a placeholder and continue
              const srcPreview = safeSrc.length > 100 ? safeSrc.substring(0, 100) + '...' : safeSrc;
              console.warn(`[VariantRenderer] Failed to load image at (${c}, ${r}):`, {
                srcPreview,
                isDataUrl: safeSrc.startsWith('data:'),
                srcLength: safeSrc.length,
                error
              });
              drawPlaceholder();
              resolved = true;
              resolve();
            };
            
            // Set a timeout to prevent hanging
            timeoutId = setTimeout(() => {
              if (!resolved && !img.complete) {
                const srcPreview = src.length > 100 ? src.substring(0, 100) + '...' : src;
                console.warn(`[VariantRenderer] Image load timeout at (${c}, ${r}):`, srcPreview);
                drawPlaceholder();
                resolved = true;
                resolve();
              }
            }, 15000); // 15 second timeout per image
            
            // Validate and start loading the image
            try {
              // Validate the source
              if (!safeSrc || safeSrc.trim() === '') {
                throw new Error('Empty image source');
              }
              
              // For data URLs, validate the format
              if (safeSrc.startsWith('data:')) {
                if (!safeSrc.includes(',')) {
                  throw new Error('Invalid data URL format');
                }
              }
              
              img.src = safeSrc;
            } catch (srcError) {
              cleanup();
              if (resolved) return;
              console.warn(`[VariantRenderer] Invalid image source at (${c}, ${r}):`, {
                error: srcError,
                srcPreview: safeSrc.substring(0, 100)
              });
              drawPlaceholder();
              resolved = true;
              resolve();
            }
          });
        };

        // Helper: safe getter that ignores center index when needed
        const memberAt = (idx: number) => variant.members[idx];

        // Draw using shared enumerator for the selected template
        if (effectiveKey === '45') {
          await enumerate45(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '12') {
          await enumerate12(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '13') {
          await enumerate13(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '14') {
          await enumerate14(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '15') {
          await enumerate15(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '16') {
          await enumerate16(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '17') {
          await enumerate17(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } 
        else if (effectiveKey === '18'){
          await enumerate18(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }
        else if (effectiveKey === '19') {
          await enumerate19(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '20'){
          await enumerate20(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '33') {
          await enumerate33(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '34') {
        await enumerate34(async (slot) => {
          if (slot.kind === 'center') {
            if (variant.centerMember?.photo) {
              await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
            } else {
              const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(x, y, w, h);
            }
            return;
          }
          const m = slot.index >= 0 ? memberAt(slot.index) : null;
          if (m?.photo) {
            await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
          }
        });
        } else if (effectiveKey === '35') {
        await enumerate35(async (slot) => {
          if (slot.kind === 'center') {
            if (variant.centerMember?.photo) {
              await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
            } else {
              const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(x, y, w, h);
            }
            return;
          }
          const m = slot.index >= 0 ? memberAt(slot.index) : null;
          if (m?.photo) {
            await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
          }
        });
        } else if (effectiveKey === '36') {
          await enumerate36(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '37') {
          await enumerate37(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
     
        } else if (effectiveKey === '38') {
        await enumerate38(async (slot) => {
          if (slot.kind === 'center') {
            if (variant.centerMember?.photo) {
              await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
            } else {
              const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(x, y, w, h);
            }
            return;
          }
          const m = slot.index >= 0 ? memberAt(slot.index) : null;
          if (m?.photo) {
            await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
          }
        });
      } else if (effectiveKey === '17') {
      await enumerate17(async (slot) => {
        if (slot.kind === 'center') {
          if (variant.centerMember?.photo) {
            await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
          } else {
            const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(x, y, w, h);
          }
          return;
        }
        const m = slot.index >= 0 ? memberAt(slot.index) : null;
        if (m?.photo) {
          await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
        }
      });
    //   } else if (effectiveKey === '39') {
    //   await enumerate39(async (slot) => {
    //     if (slot.kind === 'center') {
    //       if (variant.centerMember?.photo) {
    //         await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //       } else {
    //         const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //         ctx.fillStyle = '#f3f4f6';
    //         ctx.fillRect(x, y, w, h);
    //       }
    //       return;
    //     }
    //     const m = slot.index >= 0 ? memberAt(slot.index) : null;
    //     if (m?.photo) {
    //       await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //     }
    //   });
    //   } else if (effectiveKey === '40') {
    //   await enumerate40(async (slot) => {
    //     if (slot.kind === 'center') {
    //       if (variant.centerMember?.photo) {
    //         await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //       } else {
    //         const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //         ctx.fillStyle = '#f3f4f6';
    //         ctx.fillRect(x, y, w, h);
    //       }
    //       return;
    //     }
    //     const m = slot.index >= 0 ? memberAt(slot.index) : null;
    //     if (m?.photo) {
    //       await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
    //     }
    //   });
        } else if (effectiveKey === '39') {
          await enumerate39(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
      
        } else if (effectiveKey === '40') {
        await enumerate40(async (slot) => {
          if (slot.kind === 'center') {
            if (variant.centerMember?.photo) {
              await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
            } else {
              const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(x, y, w, h);
            }
            return;
          }
          const m = slot.index >= 0 ? memberAt(slot.index) : null;
          if (m?.photo) {
            await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
          }
        });
        } else if (effectiveKey === '41') {
          await enumerate41(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '42') {
          await enumerate42(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '43') {
            await enumerate43(async (slot) => {
              if (slot.kind === 'center') {
                if (variant.centerMember?.photo) {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } else {
                  const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                  ctx.fillStyle = '#f3f4f6';
                  ctx.fillRect(x, y, w, h);
                }
                return;
              }
              const m = slot.index >= 0 ? memberAt(slot.index) : null;
              if (m?.photo) {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              }
            });
        } else if (effectiveKey === '44') {
              await enumerate44(async (slot) => {
                if (slot.kind === 'center') {
                  if (variant.centerMember?.photo) {
                    await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                  } else {
                    const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(x, y, w, h);
                  }
                  return;
                }
                const m = slot.index >= 0 ? memberAt(slot.index) : null;
                if (m?.photo) {
                  await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                }
              });
        } else if (effectiveKey === '46') {
          await enumerate46(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '47') {
          await enumerate47(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '48') {
          await enumerate48(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '49') {
          await enumerate49(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '50') {
          await enumerate50(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '51') {
          // 51 uses 9 columns and 9-11 virtual rows; treat like 51..59 range for sizing
          await enumerate51(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '52') {
          await enumerate52(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '53') {
          await enumerate53(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '54') {
          await enumerate54(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '55') {
          await enumerate55(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '56') {
          await enumerate56(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '57') {
          await enumerate57(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '58') {
          await enumerate58(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '59') {
          await enumerate59(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '60') {
          await enumerate60(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '61') {
          await enumerate61(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '62') {
          await enumerate62(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '63') {
          await enumerate63(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '64') {
          await enumerate64(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '65') {
          await enumerate65(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '66') {
          await enumerate66(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '67') {
          await enumerate67(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '68') {
          await enumerate68(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '69') {
          await enumerate69(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '70') {
          await enumerate70(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '71') {
          await enumerate71(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '72') {
          await enumerate72(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '73') {
          await enumerate73(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '74') {
          await enumerate74(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '75') {
          await enumerate75(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '76') {
          await enumerate76(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '77') {
          await enumerate77(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '78') {
          await enumerate78(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '79') {
          await enumerate79(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '80') {
          await enumerate80(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '81') {
          await enumerate81(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '82') {
          await enumerate82(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '83') {
          await enumerate83(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '84') {
          await enumerate84(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '85') {
          await enumerate85(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }else if (effectiveKey === '86') {
          await enumerate86(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '87') {
          await enumerate87(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '88') {
          await enumerate88(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }else if (effectiveKey === '89') {
          await enumerate89(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '90') {
          await enumerate90(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '91') {
          await enumerate91(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '92') {
          await enumerate92(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        } else if (effectiveKey === '93') {
          await enumerate93(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }else if (effectiveKey === '94') {
          await enumerate94(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }else if (effectiveKey === '95') {
          await enumerate95(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }else if (effectiveKey === '96') {
          await enumerate96(async (slot) => {
            if (slot.kind === 'center') {
              if (variant.centerMember?.photo) {
                try {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } catch (imgError) {
                  // drawCover should never reject now, but catch just in case
                  console.warn(`[VariantRenderer] Center member image draw failed at (${c}, ${r}):`, imgError);
                }
              } else {
                const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x, y, w, h);
              }
              return;
            }
            const m = slot.index >= 0 ? memberAt(slot.index) : null;
            if (m?.photo) {
              try {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              } catch (imgError) {
                // drawCover should never reject now, but catch just in case
                console.warn(`[VariantRenderer] Image draw failed for member at (${c}, ${r}):`, imgError);
              }
            }
          });
        }
        else {
          // Fallback: Try to dynamically call the enumerate function if it exists
          const enumerateFnName = `enumerate${effectiveKey}`;
          const enumerateFn = (layouts as any)[enumerateFnName];
          
          if (typeof enumerateFn === 'function') {
            console.log(`[VariantRenderer] Using dynamic enumerate function: ${enumerateFnName}`);
            await enumerateFn(async (slot: any) => {
              if (slot.kind === 'center') {
                if (variant.centerMember?.photo) {
                  await drawCover(variant.centerMember.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                } else {
                  const { x, y, w, h } = rect(slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
                  ctx.fillStyle = '#f3f4f6';
                  ctx.fillRect(x, y, w, h);
                }
                return;
              }
              const m = slot.index >= 0 ? memberAt(slot.index) : null;
              if (m?.photo) {
                await drawCover(m.photo, slot.c, slot.r, slot.cspan ?? 1, slot.rspan ?? 1);
              }
            });
          } else {
            console.warn(`[VariantRenderer] No enumerate function found for template key: ${effectiveKey}`);
            console.warn(`[VariantRenderer] Available enumerate functions:`, Object.keys(layouts).filter(k => k.startsWith('enumerate')));
          }
        }
        // Export with embedded 300 DPI (pHYs chunk)
        const rawPng = canvas.toDataURL('image/png');
        if (!rawPng || rawPng === 'data:,') {
          throw new Error('Failed to generate canvas image data');
        }
        const dpiPng = embedPngDpi300(rawPng);
        console.log('[VariantRenderer] Successfully rendered variant:', variant.id, 'Image size:', dpiPng.length, 'bytes');
        onRendered(variant.id, dpiPng);

      } catch (error) {
        // Check if this is an image loading error that we're handling gracefully
        const isImageLoadError = error instanceof Error && 
          (error.message.includes('Failed to load image') || 
           error.message.includes('timeout') ||
           error.message.includes('Invalid image source'));
        
        if (isImageLoadError) {
          // Image loading errors are handled gracefully with placeholders
          // Log as warning instead of error to avoid confusion
          // Note: These errors should not occur since drawCover now resolves instead of rejecting
          console.warn(`[VariantRenderer] Image loading issue for variant ${variant.id} (should be handled gracefully):`, error.message);
        } else {
          // For other errors, log as error
          console.error('[VariantRenderer] Error generating variant image:', error);
          console.error('Variant details:', {
            id: variant.id,
            centerMember: variant.centerMember?.name,
            centerMemberPhoto: variant.centerMember?.photo?.substring(0, 50) || 'no photo',
            orderId: order.id,
            memberCount: order.members.length,
            templateKey,
            effectiveKey,
            membersWithPhotos: order.members.filter(m => m?.photo).length
          });
        }
        
        // Try to generate a fallback image with placeholders
        try {
          // Create a minimal valid canvas image
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 100;
          fallbackCanvas.height = 100;
          const fallbackCtx = fallbackCanvas.getContext('2d');
          if (fallbackCtx) {
            fallbackCtx.fillStyle = '#f3f4f6';
            fallbackCtx.fillRect(0, 0, 100, 100);
            fallbackCtx.fillStyle = '#9ca3af';
            fallbackCtx.font = '12px Arial';
            fallbackCtx.textAlign = 'center';
            fallbackCtx.textBaseline = 'middle';
            fallbackCtx.fillText('Error', 50, 50);
            const fallbackPng = fallbackCanvas.toDataURL('image/png');
            onRendered(variant.id, fallbackPng);
          } else {
            onRendered(variant.id, '');
          }
        } catch (fallbackError) {
          // If even fallback fails, send empty string
          onRendered(variant.id, '');
        }
      }
    };

    // Start generation with a delay to ensure component is ready
    const timer = setTimeout(generateVariantImage, 100);
    return () => clearTimeout(timer);
  }, [variant, onRendered, order, templateKey]);

  // Hidden canvas for any additional processing if needed
  return (
    <div className="hidden">
      <canvas ref={canvasRef} />
    </div>
  );
};

// -------- face-api helpers --------
let faceModelsLoaded = false;
async function ensureModelsLoaded() {
  if (faceModelsLoaded) return;
  const MODEL_URL = '/weights';
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  ]);
  faceModelsLoaded = true;
}

async function getFaceAwareCropAsync(img: HTMLImageElement, targetW: number, targetH: number) {
  const dRatio = targetW / targetH;

  const coverFallback = () => {
    const sRatio = img.width / img.height;
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
    return { sx, sy, sw, sh };
  };

  try {
    const det = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks();
    if (!det) return coverFallback();

    const box = det.detection.box; // { x, y, width, height }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const PADDING = 0.50; // expand to include a bit of hair/shoulders

    // size so that face box fits inside target aspect with padding
    let sw = box.width * (1 + PADDING);
    let sh = sw / dRatio;
    const neededH = box.height * (1 + PADDING);
    if (sh < neededH) {
      sh = neededH;
      sw = sh * dRatio;
    }

    // center on face
    let sx = cx - sw / 2;
    let sy = cy - sh / 2;

    // clamp to image bounds
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + sw > img.width) sx = Math.max(0, img.width - sw);
    if (sy + sh > img.height) sy = Math.max(0, img.height - sh);

    // final safety: ensure sw/sh within bounds
    sw = Math.min(sw, img.width);
    sh = Math.min(sh, img.height);

    return { sx, sy, sw, sh };
  } catch {
    return coverFallback();
  }
}
