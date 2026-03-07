export const addDpiToPng = async (imgBlob: Blob, dpiVal: number, textOverlay?: string): Promise<Blob> => {
  // 1. Ensure the blob is actually a PNG. Cloudinary f_auto often returns webp/avif.
  // If it's not a PNG, or if we need to overlay text, draw it to a canvas and export as PNG.
  let targetBlob = imgBlob;

  const isPng = async (b: Blob) => {
    const buf = await b.slice(0, 8).arrayBuffer();
    const arr = new Uint8Array(buf);
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
      if (arr[i] !== sig[i]) return false;
    }
    return true;
  };

  const needsCanvas = !!textOverlay || !(await isPng(imgBlob));

  if (needsCanvas) {
    // Convert to PNG via canvas
    const bitmap = await createImageBitmap(imgBlob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create white background just in case of transparency issues during conversion
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);

      if (textOverlay) {
        ctx.save();
        ctx.translate(canvas.width - 30, canvas.height - 30);
        ctx.scale(-1, 1);
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.strokeText(textOverlay, 0, 0);
        ctx.fillText(textOverlay, 0, 0);
        ctx.restore();
      }
    }
    
    const convertedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (convertedBlob) {
      targetBlob = convertedBlob;
    }
    bitmap.close();
  }

  // 2. Inject the pHYs chunk directly into the PNG binary
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as ArrayBuffer;
      const data = new Uint8Array(result);
      
      const ppu = Math.round(dpiVal * 39.3701); // pixels per meter
      
      const chunkType = new TextEncoder().encode('pHYs');
      const chunkData = new Uint8Array(9);
      const dv = new DataView(chunkData.buffer);
      dv.setUint32(0, ppu);
      dv.setUint32(4, ppu);
      chunkData[8] = 1; // 1 = meters
      
      const lengthBytes = new Uint8Array(4);
      new DataView(lengthBytes.buffer).setUint32(0, 9);
      
      const crc32 = (buf: Uint8Array): number => {
        let c = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
          c ^= buf[i];
          for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
        }
        return (c ^ 0xffffffff) >>> 0;
      };
      
      const crcInput = new Uint8Array(4 + chunkData.length);
      crcInput.set(chunkType, 0);
      crcInput.set(chunkData, 4);
      
      const crcBytes = new Uint8Array(4);
      new DataView(crcBytes.buffer).setUint32(0, crc32(crcInput));
      
      // IHDR is always the first chunk (starts at offset 8)
      // Length of IHDR data is at offset 8. IHDR total size = 4(length) + 4(type) + length(13) + 4(crc) = 25
      const offset = 8;
      const ihdrDataLength = new DataView(result, offset, 4).getUint32(0); // usually 13
      const ihdrTotal = 4 + 4 + ihdrDataLength + 4; 
      const insertPos = offset + ihdrTotal; // 8 + 25 = 33
      
      // Before = Signature + IHDR chunk
      const before = data.slice(0, insertPos);
      // After = Everything else (IDAT, IEND, etc.)
      const after = data.slice(insertPos);
      
      // Check if pHYs already exists. If it does, we shouldn't add a duplicate one.
      // A simple check is to search for 'pHYs' in the first 100 bytes.
      const textDecoder = new TextDecoder();
      const headerString = textDecoder.decode(data.slice(0, Math.min(200, data.length)));
      if (headerString.includes('pHYs')) {
        // We could replace it, but for simplicity if it already exists we just return the original payload
        // (However, it usually doesn't exist out of canvas.toBlob in browsers)
        resolve(targetBlob);
        return;
      }
      
      const assembled = new Uint8Array(before.length + 4 + 4 + 9 + 4 + after.length);
      let p = 0;
      assembled.set(before, p); p += before.length;
      assembled.set(lengthBytes, p); p += 4;
      assembled.set(chunkType, p); p += 4;
      assembled.set(chunkData, p); p += 9;
      assembled.set(crcBytes, p); p += 4;
      assembled.set(after, p);
      
      resolve(new Blob([assembled], { type: 'image/png' }));
    };
    reader.readAsArrayBuffer(targetBlob);
  });
};
