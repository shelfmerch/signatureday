/**
 * Utility functions for image compression and optimization
 */

/**
 * Compresses an image file by resizing and reducing quality
 * @param file - The image file to compress
 * @param maxWidth - Maximum width of the compressed image
 * @param maxHeight - Maximum height of the compressed image
 * @param quality - JPEG quality (0-1)
 * @returns Promise resolving to a compressed image data URL
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              // Width is the limiting factor
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              // Height is the limiting factor
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress the image
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Apply smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          try { 
            (ctx as any).imageSmoothingQuality = 'high'; 
          } catch (e) {
            // Ignore if browser doesn't support this property
          }
          
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with specified quality
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Estimates the size of a data URL in bytes
 * @param dataUrl - The data URL to measure
 * @returns Size in bytes
 */
export const getDataUrlSize = (dataUrl: string): number => {
  // Extract the base64 part
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  
  // Base64 encodes 3 bytes into 4 characters
  return Math.floor(base64.length * 0.75);
};

/**
 * Progressively compresses an image until it's under the target size
 * @param file - The image file to compress
 * @param targetSizeKB - Target size in KB
 * @returns Promise resolving to a compressed image data URL
 */
export const compressToTargetSize = async (
  file: File,
  targetSizeKB: number = 200
): Promise<string> => {
  const targetSizeBytes = targetSizeKB * 1024;
  
  // Start with high quality and size
  let quality = 0.9;
  let maxDimension = 1600;
  let result = await compressImage(file, maxDimension, maxDimension, quality);
  let size = getDataUrlSize(result);
  
  // Try up to 5 times to get under target size
  let attempts = 0;
  
  while (size > targetSizeBytes && attempts < 5) {
    attempts++;
    
    if (size > targetSizeBytes * 3) {
      // Way too big, reduce dimensions significantly
      maxDimension = Math.floor(maxDimension * 0.7);
      quality = Math.max(0.7, quality - 0.1);
    } else if (size > targetSizeBytes * 1.5) {
      // Moderately too big, reduce quality more than dimensions
      maxDimension = Math.floor(maxDimension * 0.85);
      quality = Math.max(0.6, quality - 0.15);
    } else {
      // Close to target, just reduce quality
      quality = Math.max(0.5, quality - 0.1);
    }
    
    result = await compressImage(file, maxDimension, maxDimension, quality);
    size = getDataUrlSize(result);
  }
  
  return result;
};



