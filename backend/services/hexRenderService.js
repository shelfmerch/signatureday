/**
 * Server-side hexagonal grid rendering using Sharp
 * Parses hexagon SVG templates and renders variants with proper hex clipping
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to hexagon SVG templates (frontend location)
const HEXAGON_SVG_DIR = path.resolve(__dirname, '../../src/components/hexagon');

// Configuration
const MAX_CONCURRENT_FETCHES = 5;
const IMAGE_FETCH_TIMEOUT_MS = 30000;

// Output settings - compressed for efficiency
const OUTPUT_CONFIG = {
    width: 1200,       // Reduced for efficiency
    height: 1900,      // Portrait ratio matching hex templates
    quality: 85,
    format: 'jpeg'
};

// Placeholders
const PLACEHOLDER_FEMALE_COLOR = '#e5e7eb';
const PLACEHOLDER_MALE_COLOR = '#d1d5db';

/**
 * Parse hexagon SVG and extract slot information
 * Mirrors frontend HexagonSvgGrid parsing logic
 */
const parseHexagonSvg = async (memberCount) => {
    const svgPath = path.join(HEXAGON_SVG_DIR, `${memberCount}.svg`);

    if (!fs.existsSync(svgPath)) {
        console.warn(`[HexRender] No SVG template found for ${memberCount} members`);
        return null;
    }

    try {
        const svgContent = fs.readFileSync(svgPath, 'utf-8');

        // Parse viewBox
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
        let viewBox = { minX: 0, minY: 0, width: 595.3, height: 936 };
        if (viewBoxMatch) {
            const parts = viewBoxMatch[1].split(/\s+/).map(Number);
            if (parts.length >= 4) {
                viewBox = { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
            }
        }

        // Extract polygons
        const polygonRegex = /<polygon[^>]*points="([^"]+)"[^>]*>/g;
        const slots = [];
        let match;

        while ((match = polygonRegex.exec(svgContent)) !== null) {
            const pointsStr = match[1].trim();
            const coords = pointsStr.split(/[\s,]+/).map(Number);

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

                // Build SVG path from polygon points
                const pathParts = ['M', String(coords[0]), String(coords[1])];
                for (let i = 2; i < coords.length; i += 2) {
                    pathParts.push('L', String(coords[i]), String(coords[i + 1]));
                }
                pathParts.push('Z');

                slots.push({
                    id: `slot-${slots.length}`,
                    path: pathParts.join(' '),
                    pointCount: coords.length / 2,
                    cx,
                    cy,
                    bbox,
                    points: pointsStr
                });
            }
        }

        // Sort: center slot first (most points), then border slots clockwise
        const maxPoints = Math.max(...slots.map(s => s.pointCount));
        const centerSlots = slots.filter(s => s.pointCount === maxPoints && s.pointCount > 15);
        const borderSlots = slots.filter(s => !(s.pointCount === maxPoints && s.pointCount > 15));

        // Sort border slots clockwise from center
        const centerX = viewBox.width / 2;
        const centerY = viewBox.height / 2;
        const sortedBorder = [...borderSlots].sort((a, b) => {
            const angleA = Math.atan2(a.cy - centerY, a.cx - centerX);
            const angleB = Math.atan2(b.cy - centerY, b.cx - centerX);
            const normA = ((angleA + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
            const normB = ((angleB + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
            return normA - normB;
        });

        const orderedSlots = [
            ...centerSlots.map(s => ({ ...s, isCenter: true })),
            ...sortedBorder.map(s => ({ ...s, isCenter: false }))
        ];

        return { slots: orderedSlots, viewBox };
    } catch (error) {
        console.error(`[HexRender] Error parsing SVG for ${memberCount}:`, error);
        return null;
    }
};

/**
 * Apply Cloudinary face-crop transformation to URL
 */
const applyFaceCropTransformation = (url, targetWidth, targetHeight) => {
    if (!url || url.startsWith('data:')) return url;

    const cloudinaryMatch = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^\/]+\/)(?:image\/upload\/)?(.*)$/);

    if (cloudinaryMatch) {
        const [, baseUrl, imagePath] = cloudinaryMatch;
        const transformation = `c_thumb,g_face,z_0.6,w_${targetWidth},h_${targetHeight},f_auto,q_auto`;
        return `${baseUrl}image/upload/${transformation}/${imagePath.replace(/^v\d+\//, '')}`;
    }

    return url;
};

/**
 * Fetch image from URL and return as buffer
 */
const fetchImageBuffer = async (url, targetWidth = 400, targetHeight = 500, timeout = IMAGE_FETCH_TIMEOUT_MS) => {
    if (!url) return null;

    try {
        if (url.startsWith('data:')) {
            const matches = url.match(/^data:image\/\w+;base64,(.+)$/);
            if (!matches) return null;
            return Buffer.from(matches[1], 'base64');
        }

        const transformedUrl = applyFaceCropTransformation(url, targetWidth, targetHeight);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(transformedUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'SignatureDay-HexRenderer/1.0' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`[HexRender] Failed to fetch image: ${response.status}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`[HexRender] Image fetch timeout`);
        } else {
            console.warn(`[HexRender] Image fetch error: ${error.message}`);
        }
        return null;
    }
};

/**
 * Create a placeholder image for missing photos
 */
const createPlaceholder = async (width, height, isMale = false) => {
    const color = isMale ? PLACEHOLDER_MALE_COLOR : PLACEHOLDER_FEMALE_COLOR;
    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 4}" 
            fill="#9ca3af" text-anchor="middle" dominant-baseline="central">?</text>
    </svg>
  `;
    return sharp(Buffer.from(svg)).png().toBuffer();
};

/**
 * Fetch all member images with rate limiting
 */
const fetchImagesWithRateLimit = async (members, cellWidth, cellHeight, maxConcurrent = MAX_CONCURRENT_FETCHES) => {
    const results = new Map();
    const queue = [...members];

    const processNext = async () => {
        if (queue.length === 0) return;

        const member = queue.shift();
        const memberId = member.id || member.memberRollNumber || `member-${members.indexOf(member)}`;

        const buffer = await fetchImageBuffer(member.photo, cellWidth, cellHeight);
        results.set(memberId, buffer);

        if (queue.length > 0) {
            await processNext();
        }
    };

    const workers = [];
    for (let i = 0; i < Math.min(maxConcurrent, members.length); i++) {
        workers.push(processNext());
    }

    await Promise.all(workers);
    return results;
};

/**
 * Create hexagonal clip mask as SVG
 */
const createHexClipSvg = (slot, width, height, viewBox) => {
    // Scale polygon points to the output dimensions
    const scaleX = width / viewBox.width;
    const scaleY = height / viewBox.height;

    // Parse and scale the points
    const coords = slot.points.split(/[\s,]+/).map(Number);
    const scaledPoints = [];
    for (let i = 0; i < coords.length; i += 2) {
        scaledPoints.push(`${coords[i] * scaleX},${coords[i + 1] * scaleY}`);
    }

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${scaledPoints.join(' ')}" fill="white"/>
    </svg>
  `;
    return Buffer.from(svg);
};

/**
 * Render a single hexagonal variant
 */
export const renderHexVariant = async (order, variant, imageBuffersMap, canvasConfig) => {
    const memberCount = order.members.length;
    const { width: canvasW, height: canvasH } = canvasConfig || OUTPUT_CONFIG;

    // Parse hexagon SVG template
    const hexData = await parseHexagonSvg(memberCount);
    if (!hexData) {
        throw new Error(`No hexagon template found for ${memberCount} members`);
    }

    const { slots, viewBox } = hexData;

    // Scale factors
    const scaleX = canvasW / viewBox.width;
    const scaleY = canvasH / viewBox.height;

    // Get photo for slot
    const getPhotoForSlot = (slotIndex) => {
        const slot = slots[slotIndex];
        if (slot.isCenter) {
            // Center slot - use the variant's center member
            const memberId = variant.centerMember.id || variant.centerMember.memberRollNumber;
            return imageBuffersMap.get(memberId);
        }
        // Border slots: index 1..n map to variant.members
        const memberIndex = slotIndex - 1;
        if (memberIndex >= 0 && memberIndex < variant.members.length) {
            const member = variant.members[memberIndex];
            if (member) {
                const memberId = member.id || member.memberRollNumber || `member-${memberIndex}`;
                return imageBuffersMap.get(memberId);
            }
        }
        return null;
    };

    // Create base canvas with cyan background (matches hex template)
    let baseCanvas = sharp({
        create: {
            width: canvasW,
            height: canvasH,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
        }
    });

    const compositeInputs = [];

    // Process each slot
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const imageBuffer = getPhotoForSlot(i);

        // Calculate scaled position and size
        const x = Math.round(slot.bbox.x * scaleX);
        const y = Math.round(slot.bbox.y * scaleY);
        const w = Math.round(slot.bbox.width * scaleX);
        const h = Math.round(slot.bbox.height * scaleY);

        // Create the hex cell background (cyan)
        const hexBgSvg = `
      <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${slot.points.split(/[\s,]+/).map((v, i) =>
            i % 2 === 0 ? Number(v) * scaleX : Number(v) * scaleY
        ).join(',')}" fill="#00c1f3" stroke="#231f20" stroke-width="2"/>
      </svg>
    `;
        compositeInputs.push({
            input: Buffer.from(hexBgSvg),
            left: 0,
            top: 0
        });

        // Process member image if available
        if (imageBuffer) {
            try {
                // Resize image to cover the cell
                const imgSize = Math.max(w, h);
                const resizedImage = await sharp(imageBuffer)
                    .resize(imgSize, imgSize, { fit: 'cover', position: 'centre' })
                    .png()
                    .toBuffer();

                // Create hex clip mask
                const clipMask = createHexClipSvg(slot, canvasW, canvasH, viewBox);

                // Create a positioned version of the image
                const imgX = x + Math.round((w - imgSize) / 2);
                const imgY = y + Math.round((h - imgSize) / 2);

                // Create image layer with positioning
                const positionedImage = await sharp({
                    create: {
                        width: canvasW,
                        height: canvasH,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
                })
                    .composite([{
                        input: resizedImage,
                        left: Math.max(0, imgX),
                        top: Math.max(0, imgY)
                    }])
                    .png()
                    .toBuffer();

                // Apply hex clip mask
                const clippedImage = await sharp(positionedImage)
                    .composite([{
                        input: clipMask,
                        blend: 'dest-in'
                    }])
                    .png()
                    .toBuffer();

                compositeInputs.push({
                    input: clippedImage,
                    left: 0,
                    top: 0
                });
            } catch (err) {
                console.warn(`[HexRender] Failed to process image for slot ${i}:`, err.message);
            }
        }
    }

    // Composite all layers
    const outputBuffer = await baseCanvas
        .composite(compositeInputs)
        .jpeg({
            quality: OUTPUT_CONFIG.quality,
            mozjpeg: true
        })
        .toBuffer();

    return outputBuffer;
};

/**
 * Check if an order should use hexagonal rendering
 */
export const isHexagonalOrder = (order) => {
    return order.gridTemplate === 'hexagonal' || order.gridTemplate === 'hexagon';
};

/**
 * Get hexagon render config
 */
export const getHexCanvasConfig = (memberCount) => {
    return OUTPUT_CONFIG;
};

/**
 * Get sample cell dimensions for image pre-fetching
 */
export const getHexCellDimensions = async (memberCount) => {
    const hexData = await parseHexagonSvg(memberCount);
    if (!hexData || hexData.slots.length === 0) {
        return { width: 200, height: 200 }; // Default
    }

    // Use first non-center slot as reference
    const sampleSlot = hexData.slots.find(s => !s.isCenter) || hexData.slots[0];
    const scaleX = OUTPUT_CONFIG.width / hexData.viewBox.width;
    const scaleY = OUTPUT_CONFIG.height / hexData.viewBox.height;

    return {
        width: Math.round(sampleSlot.bbox.width * scaleX),
        height: Math.round(sampleSlot.bbox.height * scaleY)
    };
};

export { parseHexagonSvg, fetchImagesWithRateLimit };
