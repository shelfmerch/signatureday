// Simple Cloudinary unsigned upload helper
// Requires env vars:
//   VITE_CLOUDINARY_CLOUD_NAME
//   VITE_CLOUDINARY_UNSIGNED_PRESET

/**
 * Convert a data URL (e.g. from canvas.toDataURL('image/png')) to a File.
 * Used for uploading variant images to Cloudinary.
 */
export function dataURLToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = (arr[0]?.match(/:(.*?);/)?.[1] || 'image/png').trim();
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

export interface CloudinaryUploadResult {
  asset_id: string;
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadToCloudinary(file: File, folder?: string): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  const unsignedPreset = import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET as string;
  if (!cloudName || !unsignedPreset) {
    throw new Error('Cloudinary env not configured: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UNSIGNED_PRESET');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', unsignedPreset);
  if (folder) form.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  // Debug logs
  console.debug('[Cloudinary] Starting upload', {
    endpoint,
    cloudName,
    unsignedPreset: unsignedPreset?.slice(0, 6) + '***',
    folder: folder || '(none)'
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[Cloudinary] Upload failed', { status: res.status, statusText: res.statusText, body: text });
    throw new Error(`Cloudinary upload failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const json = (await res.json()) as CloudinaryUploadResult;
  console.debug('[Cloudinary] Upload success', {
    public_id: json.public_id,
    format: json.format,
    width: json.width,
    height: json.height,
    secure_url_sample: json.secure_url?.slice(0, 60) + '...'
  });
  return json;
}

export function buildDisplayUrl(publicId: string, options?: { q?: string; f?: string; w?: number; h?: number; c?: string }) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  const q = options?.q ?? 'auto';
  const f = options?.f ?? 'auto';
  const w = options?.w;
  const h = options?.h;
  const c = options?.c ?? (w || h ? 'fill' : undefined);
  const parts = [
    `f_${f}`,
    `q_${q}`,
    ...(w ? [`w_${w}`] : []),
    ...(h ? [`h_${h}`] : []),
    ...(c ? [`c_${c}`] : []),
  ].join(',');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${parts}/${publicId}`;
}
