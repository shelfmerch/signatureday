/**
 * Face detection service using Web Workers
 * This service manages communication with the face detection worker
 */

// Web workers removed. This file now provides lightweight stubs and a
// simple cover-crop implementation without any face detection.
// Keeping the API surface prevents import errors elsewhere.

// No worker instance is used anymore
let worker: null = null;

// No pending request tracking needed
const pendingRequests = new Map<string, never>();

// Generate unique request IDs (not used, kept for API compatibility)
let requestCounter = 0;
const generateRequestId = () => `req_${Date.now()}_${requestCounter++}`;

/**
 * Initialize the face detection worker
 */
export const initFaceDetectionWorker = (): Promise<void> => {
  // No-op (workers removed)
  return Promise.resolve();
};

/**
 * Load face detection models
 * @param modelUrl - URL to the face detection models
 */
export const loadFaceDetectionModels = async (_modelUrl: string): Promise<void> => {
  // No-op (face models not used)
  return Promise.resolve();
};

/**
 * Detect faces in an image
 * @param imageFile - Image file to process
 */
export const detectFaces = async (_imageFile: File): Promise<any[]> => {
  // No face detection; always return empty
  return [];
};

/**
 * Crop an image to cover the target rectangle (no face detection).
 * @param imageFile - Image file to crop
 * @param targetWidth - Width of the output image
 * @param targetHeight - Height of the output image
 */
export const cropFace = async (
  imageFile: File,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  // Directly use cover algorithm without any face detection
  return await cropFaceMainThread(imageFile, targetWidth, targetHeight);
};

export async function cropFaceMainThread(
  imageFile: File,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  // Draw image to canvas (no face detection). Perform cover crop to target.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = URL.createObjectURL(imageFile);
  });
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = targetWidth;
  resultCanvas.height = targetHeight;
  const rctx = resultCanvas.getContext('2d');
  if (!rctx) throw new Error('Could not get result canvas context');

  // Cover crop (centered) without face awareness
  const dRatio = targetWidth / targetHeight;
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
  rctx.imageSmoothingEnabled = true;
  try { (rctx as any).imageSmoothingQuality = 'high'; } catch {}
  rctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  return resultCanvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Convert a file to ImageData
 * @param file - Image file to convert
 */
const fileToImageData = async (file: File): Promise<{ data: ImageData; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({
        data: imageData,
        width: canvas.width,
        height: canvas.height
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};



