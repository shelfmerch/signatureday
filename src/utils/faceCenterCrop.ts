import { cropFaceMainThread } from './faceDetectionService';

/**
 * Center crop an image around a detected face
 * @param imgFile - Image file to crop
 * @param containerWidth - Width of the output image
 * @param containerHeight - Height of the output image
 * @returns Promise resolving to a data URL of the cropped image
 */
export async function centerCropFace(
  imgFile: File,
  containerWidth: number,
  containerHeight: number,
): Promise<string> {
  // Always use main-thread face-api processing
  // IMPORTANT: Do not downgrade quality. Detect the image's natural size and crop at source resolution.
  const imgDims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve({ w: i.naturalWidth || i.width, h: i.naturalHeight || i.height });
    i.onerror = () => reject(new Error('Failed to read image dimensions'));
    i.src = URL.createObjectURL(imgFile);
  });
  return await cropFaceMainThread(imgFile, imgDims.w, imgDims.h);
}
