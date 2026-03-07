
import React, { useState } from 'react';
import { Download, Eye, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GridVariant } from '@/utils/gridVariantGenerator';
import { toast } from 'sonner';

const PLACEHOLDER_IMAGE_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function isHeicLikeUrl(url?: string) {
  if (!url) return false;
  const qIndex = url.indexOf('?');
  const base = qIndex >= 0 ? url.slice(0, qIndex) : url;
  return /\.(heic|heif)$/i.test(base);
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

interface CenterVariantsGalleryProps {
  variants: GridVariant[];
  renderedImages: Record<string, string>;
  onDownloadSelected: (variantIds: string[]) => void;
  onDownloadAll: () => void;
  onPreview: (variant: GridVariant) => void;
}

export const CenterVariantsGallery: React.FC<CenterVariantsGalleryProps> = ({
  variants,
  renderedImages,
  onDownloadSelected,
  onDownloadAll,
  onPreview,
}) => {
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [previewVariant, setPreviewVariant] = useState<GridVariant | null>(null);

  const handleSelectAll = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map(v => v.id));
    }
  };

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariants(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleDownloadSingle = async (variantId: string) => {
    const imageData = renderedImages[variantId];
    if (!imageData) {
      toast.error('Image not ready for download');
      return;
    }

    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;

    const baseFilename = `grid-variant-${variant.centerMember.name.replace(/\s+/g, '-').toLowerCase()}`;

    let downloadUrl = imageData;

    // Normalize via Cloudinary helper (adds f_auto,q_auto safely)
    const safeUrl = cloudinarySafeUrl(imageData) || imageData;

    if (safeUrl.includes('cloudinary.com')) {
      const marker = safeUrl.includes('/image/upload/')
        ? '/image/upload/'
        : safeUrl.includes('/upload/')
          ? '/upload/'
          : null;

      if (marker) {
        downloadUrl = safeUrl.replace(
          marker,
          `${marker}f_png,w_2550,h_3450,c_pad,b_white/`
        );
      } else {
        downloadUrl = safeUrl;
      }
    } else {
      downloadUrl = safeUrl;
    }

    toast.info('Preparing high-res download...');
    try {
      const { addDpiToPng } = await import('@/utils/pngDpi');
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const finalBlob = await addDpiToPng(blob, 300, variant.centerMember.name);
      const objectUrl = URL.createObjectURL(finalBlob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${baseFilename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success('Variant downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to prepare high-res image');
    }
  };

  const handlePreviewVariant = (variant: GridVariant) => {
    setPreviewVariant(variant);
    onPreview(variant);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rawUrl = img.dataset.rawSrc;
    const stage = img.dataset.fallbackStage;

    // Prevent infinite error loops.
    if (stage === 'final') return;

    // First error: if original was HEIC/HEIF, try swapping extension to .jpg (still through Cloudinary).
    if (!stage && rawUrl && isHeicLikeUrl(rawUrl)) {
      const secondAttempt = cloudinarySafeUrl(cloudinarySecondAttempt(rawUrl));
      img.dataset.fallbackStage = 'second';

      if (secondAttempt && secondAttempt !== img.src) {
        console.debug('[CenterVariantsGallery] img onError: second attempt', {
          raw: rawUrl,
          safe: cloudinarySafeUrl(rawUrl),
          secondAttempt,
        });
        img.src = secondAttempt;
        return;
      }
    }

    // Second error (or non-HEIC): fall back to a placeholder.
    img.dataset.fallbackStage = 'final';
    console.debug('[CenterVariantsGallery] img onError: placeholder fallback', {
      raw: rawUrl,
      currentSrc: img.src,
    });
    img.src = PLACEHOLDER_IMAGE_URL;
  };

  const previewRawUrl = previewVariant ? renderedImages[previewVariant.id] : undefined;
  const previewSafeUrl = cloudinarySafeUrl(previewRawUrl);
  if (previewVariant && previewRawUrl && previewSafeUrl && previewSafeUrl !== previewRawUrl) {
    console.debug('[CenterVariantsGallery] preview RAW/SAFE', {
      id: previewVariant.id,
      raw: previewRawUrl,
      safe: previewSafeUrl,
    });
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex items-center space-x-2"
          >
            {selectedVariants.length === variants.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>Select All ({variants.length})</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedVariants.length} of {variants.length} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => onDownloadSelected(selectedVariants)}
            disabled={selectedVariants.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Selected ({selectedVariants.length})
          </Button>
          <Button onClick={onDownloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {variants.map((variant) => {
          const imageData = renderedImages[variant.id];

          const isSelected = selectedVariants.includes(variant.id);
          const safeImageData = cloudinarySafeUrl(imageData);
          if (imageData && safeImageData && safeImageData !== imageData) {
            console.debug('[CenterVariantsGallery] gallery RAW/SAFE', {
              id: variant.id,
              raw: imageData,
              safe: safeImageData,
            });
          }

          return (
            <Card key={variant.id} className={`relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-2">
                <div className="aspect-square relative">
                  {imageData ? (
                    <img
                      src={safeImageData}
                      data-raw-src={imageData}
                      onError={handleImgError}
                      alt={`Variant with ${variant.centerMember.name} in center`}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted animate-pulse rounded flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">Rendering...</span>
                    </div>
                  )}

                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectVariant(variant.id)}
                      className="bg-white/80 backdrop-blur-sm"
                    />
                  </div>

                  {/* Action Buttons */}
                  {imageData && (
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePreviewVariant(variant)}
                        className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadSingle(variant.id)}
                        className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <p className="text-sm font-medium truncate">{variant.centerMember.name}</p>
                  <p className="text-xs text-muted-foreground">Center Position</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewVariant} onOpenChange={() => setPreviewVariant(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Preview: {previewVariant?.centerMember.name} in Center
            </DialogTitle>
          </DialogHeader>
          {previewVariant && renderedImages[previewVariant.id] && (
            <div className="flex justify-center">
              <div className="relative inline-block max-w-full">
                <img
                  src={previewSafeUrl}
                  data-raw-src={previewRawUrl}
                  onError={handleImgError}
                  alt={`Preview of variant with ${previewVariant.centerMember.name} in center`}
                  className="max-w-full max-h-[70vh] object-contain rounded drop-shadow-md"
                />
                <div
                  className="absolute bottom-[2%] right-[2%] text-black font-bold drop-shadow-[0_0_2px_rgba(255,255,255,1)]"
                  style={{
                    transform: 'scaleX(-1)',
                    fontSize: 'clamp(14px, 4vw, 36px)',
                    WebkitTextStroke: '1px white'
                  }}
                >
                  {previewVariant.centerMember.name}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
