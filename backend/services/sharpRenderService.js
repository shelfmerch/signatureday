/**
 * Industry-grade server-side variant rendering using Sharp
 * No browser dependencies - pure Node.js image processing
 * Features:
 * - Face-aware cropping via Cloudinary transformations
 * - Compressed output images
 * - Stores results in VariationTemplates collection
 */

import sharp from 'sharp';
import OrderRenderStatus from '../models/OrderRenderStatus.js';
import Order from '../models/orderModel.js';
import VariationTemplate from '../models/VariationTemplate.js';
import { generateGridVariants } from '../utils/gridVariantGenerator.js';
import { getLayoutForMemberCount, calculateCellPositions } from '../utils/templateLayouts.js';
import { isHexagonalOrder, renderHexVariant, getHexCanvasConfig, getHexCellDimensions, fetchImagesWithRateLimit as fetchHexImages } from './hexRenderService.js';
import fetch from 'node-fetch';

// Configuration
const MAX_CONCURRENT_FETCHES = 5;
const IMAGE_FETCH_TIMEOUT_MS = 30000;

// Output image settings - compressed for efficiency
const OUTPUT_CONFIG = {
  // Reduced canvas size for faster processing and smaller files
  small: { width: 1200, height: 2025 },  // For smaller templates (12-23 members) - 50% of original
  large: { width: 1275, height: 2025 },  // For larger templates (33+ members) - 50% of original
  // JPEG quality for compression (0-100)
  quality: 85,
  // Output format
  format: 'jpeg'
};

/**
 * Get canvas config based on member count
 */
const getCanvasConfig = (memberCount) => {
  if (memberCount >= 24) {
    return OUTPUT_CONFIG.large;
  }
  return OUTPUT_CONFIG.small;
};

/**
 * Apply Cloudinary face-crop transformation to URL
 * Uses Cloudinary's auto-gravity face detection for optimal cropping
 */
const applyFaceCropTransformation = (url, targetWidth, targetHeight) => {
  if (!url || url.startsWith('data:')) {
    return url; // Can't transform data URLs
  }

  // Check if it's a Cloudinary URL
  const cloudinaryMatch = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^\/]+\/)(?:image\/upload\/)?(.*)$/);

  if (cloudinaryMatch) {
    const [, baseUrl, imagePath] = cloudinaryMatch;
    // Apply face-aware crop transformation
    // c_thumb: thumbnail crop mode
    // g_face: auto-detect face and center on it
    // w_X,h_Y: target dimensions
    // f_auto: auto format
    // q_auto: auto quality
    const transformation = `c_thumb,g_face,z_0.6,w_${targetWidth},h_${targetHeight},f_auto,q_auto`;
    return `${baseUrl}image/upload/${transformation}/${imagePath.replace(/^v\d+\//, '')}`;
  }

  return url; // Non-Cloudinary URLs returned as-is
};

/**
 * Fetch image from URL or data URL, return as Sharp buffer
 * Applies face-crop transformation for Cloudinary URLs
 */
const fetchImageBuffer = async (url, targetWidth = 400, targetHeight = 500, timeout = IMAGE_FETCH_TIMEOUT_MS) => {
  if (!url) return null;

  try {
    // Handle data URLs
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:image\/\w+;base64,(.+)$/);
      if (!matches) return null;
      return Buffer.from(matches[1], 'base64');
    }

    // Apply face-crop transformation for Cloudinary URLs
    const transformedUrl = applyFaceCropTransformation(url, targetWidth, targetHeight);

    // Handle HTTP URLs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(transformedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SignatureDay-Renderer/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[SharpRender] Failed to fetch image: ${response.status} ${url.substring(0, 50)}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[SharpRender] Image fetch timeout: ${url.substring(0, 50)}`);
    } else {
      console.warn(`[SharpRender] Image fetch error: ${error.message} - ${url.substring(0, 50)}`);
    }
    return null;
  }
};

/**
 * Create a placeholder image for missing photos
 */
const createPlaceholder = async (width, height, text = '?') => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 4}" 
            fill="#9ca3af" text-anchor="middle" dominant-baseline="central">${text}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).jpeg({ quality: OUTPUT_CONFIG.quality }).toBuffer();
};

/**
 * Process and resize an image to fit a cell (cover mode)
 */
const processImage = async (imageBuffer, targetWidth, targetHeight) => {
  if (!imageBuffer) {
    return createPlaceholder(targetWidth, targetHeight);
  }

  try {
    return await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: OUTPUT_CONFIG.quality })
      .toBuffer();
  } catch (error) {
    console.warn(`[SharpRender] Image processing error: ${error.message}`);
    return createPlaceholder(targetWidth, targetHeight);
  }
};

/**
 * Fetch multiple images concurrently with rate limiting
 * Applies face-crop for each image
 */
const fetchImagesWithRateLimit = async (members, cellWidth, cellHeight, maxConcurrent = MAX_CONCURRENT_FETCHES) => {
  const results = new Map();
  const queue = [...members];

  const processNext = async () => {
    if (queue.length === 0) return;

    const member = queue.shift();
    const memberId = member.id || member.memberRollNumber || `member-${members.indexOf(member)}`;

    // Fetch with face-crop transformation
    const buffer = await fetchImageBuffer(member.photo, cellWidth, cellHeight);
    results.set(memberId, buffer);

    // Process next in queue
    if (queue.length > 0) {
      await processNext();
    }
  };

  // Start concurrent fetches
  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrent, members.length); i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);
  return results;
};

/**
 * Render a single variant using Sharp with proper template layout
 */
const renderVariantWithSharp = async (order, variant, imageBuffersMap, canvasConfig) => {
  const memberCount = order.members.length;
  const { width: canvasW, height: canvasH } = canvasConfig;

  // Get layout for this member count
  const layout = getLayoutForMemberCount(memberCount);
  const cellPositions = calculateCellPositions(layout, canvasW, canvasH, 2); // Reduced gap for smaller canvas

  // Create base canvas (white background)
  let composite = sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  });

  const compositeInputs = [];

  // Process each slot in the layout
  for (const cell of cellPositions) {
    let imageBuffer = null;
    let memberId = null;

    if (cell.kind === 'center') {
      // Center cell - use the variant's center member
      const centerMember = variant.centerMember;
      memberId = centerMember.id || centerMember.memberRollNumber;
      imageBuffer = imageBuffersMap.get(memberId);
    } else {
      // Border cell - use the member at the specified index
      const memberIndex = cell.index;
      if (memberIndex >= 0 && memberIndex < variant.members.length) {
        const member = variant.members[memberIndex];
        if (member) {
          memberId = member.id || member.memberRollNumber || `member-${memberIndex}`;
          imageBuffer = imageBuffersMap.get(memberId);
        }
      }
    }

    // Process and add to composite
    const processedBuffer = await processImage(imageBuffer, cell.width, cell.height);

    compositeInputs.push({
      input: processedBuffer,
      left: cell.x,
      top: cell.y
    });
  }

  // Composite all images and compress
  const outputBuffer = await composite
    .composite(compositeInputs)
    .jpeg({
      quality: OUTPUT_CONFIG.quality,
      mozjpeg: true // Use mozjpeg for better compression
    })
    .toBuffer();

  return outputBuffer;
};

/**
 * Upload compressed image buffer to Cloudinary
 */
const uploadToCloudinary = async (imageBuffer, folder = 'center-variants') => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UNSIGNED_PRESET || process.env.VITE_CLOUDINARY_UNSIGNED_PRESET;

  if (!cloudName || !preset) {
    console.warn('[SharpRender] Cloudinary not configured');
    return { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`, sizeBytes: imageBuffer.length };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('upload_preset', preset);
    if (folder) formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloudinary upload failed: ${response.status} ${text}`);
    }

    const json = await response.json();
    return {
      url: json.secure_url,
      sizeBytes: json.bytes,
      width: json.width,
      height: json.height,
      format: json.format
    };
  } catch (error) {
    console.error('[SharpRender] Cloudinary upload error:', error.message);
    return { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`, sizeBytes: imageBuffer.length };
  }
};

/**
 * Queue a render job for an order
 */
export const queueOrderRender = async (orderId) => {
  const orderIdStr = String(orderId);

  try {
    let renderStatus = await OrderRenderStatus.findOne({ orderId: orderIdStr });

    if (renderStatus && (renderStatus.status === 'completed' || renderStatus.status === 'processing')) {
      console.log(`[SharpRender] Order ${orderId} already ${renderStatus.status}, skipping`);
      return;
    }

    if (!renderStatus) {
      renderStatus = await OrderRenderStatus.create({
        orderId: orderIdStr,
        status: 'queued',
        totalVariants: 0,
        completedVariants: 0,
        variants: []
      });
    } else {
      await OrderRenderStatus.findByIdAndUpdate(renderStatus._id, {
        status: 'queued',
        error: null,
        completedVariants: 0
      });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdStr);
    const order = await Order.findOne(
      isObjectId ? { _id: orderIdStr } : { clientOrderId: orderIdStr }
    ).lean();

    if (!order) {
      throw new Error('Order not found');
    }

    const effectiveOrderId = order.clientOrderId || String(order._id);

    setImmediate(() => {
      processRenderJob(effectiveOrderId, order, renderStatus._id).catch(err => {
        console.error(`[SharpRender] Background job failed for order ${orderId}:`, err);
      });
    });

  } catch (error) {
    console.error(`[SharpRender] Failed to queue render for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Process the render job using Sharp
 * Generates BOTH square and hexagonal variants for each order
 * Saves results to VariationTemplates collection
 */
const processRenderJob = async (orderId, order, statusId) => {
  console.log(`[SharpRender] Starting job for order ${orderId} (${order.members.length} members)`);

  try {
    await OrderRenderStatus.findByIdAndUpdate(statusId, { status: 'processing' });

    // Generate variants for BOTH square and hexagonal grids
    let squareVariants = [];
    let hexVariants = [];

    try {
      squareVariants = generateGridVariants(order, 'square');
      console.log(`[SharpRender] Generated ${squareVariants.length} square variants`);
    } catch (e) {
      console.warn(`[SharpRender] Could not generate square variants: ${e.message}`);
    }

    try {
      hexVariants = generateGridVariants(order, 'hexagonal');
      console.log(`[SharpRender] Generated ${hexVariants.length} hexagonal variants`);
    } catch (e) {
      console.warn(`[SharpRender] Could not generate hexagonal variants: ${e.message}`);
    }

    const allVariants = [
      ...squareVariants.map(v => ({ ...v, gridType: 'square' })),
      ...hexVariants.map(v => ({ ...v, gridType: 'hexagonal' }))
    ];

    if (allVariants.length === 0) {
      console.log(`[SharpRender] No variants to generate for order ${orderId}`);
      await OrderRenderStatus.findByIdAndUpdate(statusId, {
        status: 'completed',
        totalVariants: 0,
        completedVariants: 0
      });
      return;
    }

    console.log(`[SharpRender] Total variants to render: ${allVariants.length} (${squareVariants.length} square + ${hexVariants.length} hex)`);

    await OrderRenderStatus.findByIdAndUpdate(statusId, {
      totalVariants: allVariants.length,
      variants: allVariants.map(v => ({
        variantId: v.id,
        centerMemberId: v.centerMember.id,
        gridType: v.gridType,
        status: 'pending'
      }))
    });

    // Delete existing variation templates for this order (for re-renders)
    await VariationTemplate.deleteMany({ orderId });

    // Pre-fetch all member images (use dimensions suitable for both grid types)
    const squareCanvasConfig = getCanvasConfig(order.members.length);
    const layout = getLayoutForMemberCount(order.members.length);
    const cellPositions = calculateCellPositions(layout, squareCanvasConfig.width, squareCanvasConfig.height, 2);
    const sampleCell = cellPositions.find(c => c.kind !== 'center') || cellPositions[0];
    const cellWidth = Math.round(sampleCell.width);
    const cellHeight = Math.round(sampleCell.height);

    console.log(`[SharpRender] Fetching ${order.members.length} member images with face-crop (${cellWidth}x${cellHeight})...`);
    const imageBuffersMap = await fetchImagesWithRateLimit(order.members, cellWidth, cellHeight);
    console.log(`[SharpRender] Fetched ${imageBuffersMap.size} images`);

    const results = [];
    const failedVariants = [];

    // Process each variant
    for (let i = 0; i < allVariants.length; i++) {
      const variant = allVariants[i];
      const variantId = variant.id;
      const gridType = variant.gridType;
      const centerMemberId = variant.centerMember.id || variant.centerMember.memberRollNumber;
      const centerMemberName = variant.centerMember?.name;

      console.log(`[SharpRender] Rendering ${gridType} variant ${i + 1}/${allVariants.length}: ${variantId} (center: ${centerMemberName})`);

      try {
        // Render with appropriate service based on grid type
        let imageBuffer;
        if (gridType === 'hexagonal') {
          const hexCanvasConfig = getHexCanvasConfig(order.members.length);
          imageBuffer = await renderHexVariant(order, variant, imageBuffersMap, hexCanvasConfig);
        } else {
          imageBuffer = await renderVariantWithSharp(order, variant, imageBuffersMap, squareCanvasConfig);
        }

        // Upload to Cloudinary with grid type in folder path
        const uploadResult = await uploadToCloudinary(imageBuffer, `center-variants/${orderId}/${gridType}`);

        // Save to VariationTemplates collection with gridType
        await VariationTemplate.create({
          orderId,
          variantId,
          gridType,
          centerMemberId,
          centerMemberName,
          imageUrl: uploadResult.url,
          width: uploadResult.width || (gridType === 'hexagonal' ? 1200 : squareCanvasConfig.width),
          height: uploadResult.height || (gridType === 'hexagonal' ? 1900 : squareCanvasConfig.height),
          sizeBytes: uploadResult.sizeBytes || imageBuffer.length,
          format: uploadResult.format || 'jpeg',
          status: 'completed'
        });

        // Update render status
        await OrderRenderStatus.updateOne(
          { _id: statusId, "variants.variantId": variantId },
          {
            $set: {
              "variants.$.status": 'completed',
              "variants.$.imageUrl": uploadResult.url,
              "variants.$.centerMemberName": centerMemberName
            },
            $inc: { completedVariants: 1 }
          }
        );

        results.push({ variantId, imageUrl: uploadResult.url, centerMemberName, gridType });
        console.log(`[SharpRender] Completed ${gridType} variant ${variantId} (${Math.round(imageBuffer.length / 1024)}KB)`);

      } catch (variantError) {
        console.error(`[SharpRender] Failed ${gridType} variant ${variantId}:`, variantError.message);
        failedVariants.push({ variantId, gridType, error: variantError.message });

        // Save failed status to VariationTemplates
        await VariationTemplate.create({
          orderId,
          variantId,
          gridType,
          centerMemberId,
          centerMemberName,
          imageUrl: '',
          status: 'failed',
          error: variantError.message
        });

        await OrderRenderStatus.updateOne(
          { _id: statusId, "variants.variantId": variantId },
          { $set: { "variants.$.status": 'failed', "variants.$.error": variantError.message } }
        );
      }
    }

    const allFailed = failedVariants.length === allVariants.length;
    const finalStatus = allFailed ? 'failed' : 'completed';

    await OrderRenderStatus.findByIdAndUpdate(statusId, {
      status: finalStatus,
      completedVariants: results.length,
      error: failedVariants.length > 0 ? `${failedVariants.length} variants failed` : null
    });

    // Update Order.centerVariantImages for backward compatibility (include gridType)
    if (results.length > 0) {
      const centerVariantImages = results.map(r => ({
        variantId: r.variantId,
        imageUrl: r.imageUrl,
        centerMemberName: r.centerMemberName,
        gridType: r.gridType
      }));

      await Order.findOneAndUpdate(
        { clientOrderId: orderId },
        { $set: { centerVariantImages } }
      );
    }

    console.log(`[SharpRender] Job ${finalStatus} for order ${orderId}: ${results.length}/${allVariants.length} variants (${squareVariants.length} square, ${hexVariants.length} hex)`);

  } catch (error) {
    console.error(`[SharpRender] Job failed for order ${orderId}:`, error);

    await OrderRenderStatus.findByIdAndUpdate(statusId, {
      status: 'failed',
      error: error.message
    });
  }
};

/**
 * Get variation templates for an order from the database
 */
export const getVariationTemplates = async (orderId) => {
  return VariationTemplate.find({ orderId, status: 'completed' }).lean();
};
