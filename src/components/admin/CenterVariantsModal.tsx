import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order } from '@/types/admin';
import { generateGridVariants, GridVariant, getTemplateLayout } from '@/utils/gridVariantGenerator';
import { VariantRenderer } from './VariantRenderer';
import { HexagonVariantRenderer } from './HexagonVariantRenderer';
import { CenterVariantsGallery } from './CenterVariantsGallery';
import { toast } from 'sonner';
import { dataURLToFile, uploadToCloudinary } from '@/lib/cloudinary';
import { ordersApi } from '@/lib/api';
import { Grid, Hexagon } from 'lucide-react';

interface CenterVariantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  preloadedVariants?: GridVariant[];
  fetchedVariants?: GridVariant[];
  fetchedRenderedImages?: Record<string, string>;
  /** Hexagonal variants from server */
  fetchedHexagonalVariants?: GridVariant[];
  fetchedHexagonalRenderedImages?: Record<string, string>;
  onSavedToBackend?: () => void;
  /** Force a specific grid type for variant rendering */
  gridType?: 'square' | 'hexagonal';
}

export const CenterVariantsModal: React.FC<CenterVariantsModalProps> = ({
  open,
  onOpenChange,
  order,
  preloadedVariants = [],
  fetchedVariants,
  fetchedRenderedImages,
  fetchedHexagonalVariants,
  fetchedHexagonalRenderedImages,
  onSavedToBackend,
  gridType,
}) => {
  const hasSquareVariants = Boolean(
    fetchedVariants?.length && fetchedRenderedImages && Object.keys(fetchedRenderedImages).length > 0
  );
  const hasHexVariants = Boolean(
    fetchedHexagonalVariants?.length && fetchedHexagonalRenderedImages && Object.keys(fetchedHexagonalRenderedImages).length > 0
  );
  const isFetchedMode = hasSquareVariants || hasHexVariants;
  const [activeTab, setActiveTab] = useState<'square' | 'hexagonal'>('square');
  const CACHE_KEY_PREFIX = 'variant-image-v2-';
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [variants, setVariants] = useState<GridVariant[]>([]);
  const [renderedImages, setRenderedImages] = useState<Record<string, string>>({});
  const [currentRenderIndex, setCurrentRenderIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadedImagesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (isFetchedMode) {
        // Determine which tab to show based on available data
        if (hasSquareVariants && hasHexVariants) {
          setActiveTab('square'); // Default to square when both are available
        } else if (hasHexVariants) {
          setActiveTab('hexagonal');
        } else {
          setActiveTab('square');
        }

        // Load square variants if available
        if (hasSquareVariants && fetchedVariants && fetchedRenderedImages) {
          setVariants(fetchedVariants);
          setRenderedImages(fetchedRenderedImages);
        }

        setIsGenerating(false);
        setProgress(100);
        setError(null);

        const totalVariants = (fetchedVariants?.length || 0) + (fetchedHexagonalVariants?.length || 0);
        toast.success(`Loaded ${totalVariants} center variants from server (${fetchedVariants?.length || 0} square, ${fetchedHexagonalVariants?.length || 0} hexagonal)`);
        return;
      }
      // Diagnostic logging for specific order
      if (order.id === 'ORD-1769261339167' || order.id?.includes('1769261339167')) {
        console.log('=== DIAGNOSTIC: Order ORD-1769261339167 ===');
        console.log('Full order object:', JSON.stringify(order, null, 2));
        console.log('Order members:', order.members);
        console.log('Members count:', order.members?.length);
        console.log('Grid template:', order.gridTemplate);
        console.log('Members with photos:', order.members?.filter(m => m?.photo && m.photo.trim() !== '')?.length);
        console.log('Members without photos:', order.members?.filter(m => !m?.photo || m.photo.trim() === '')?.map(m => ({ name: m.name, hasPhoto: !!m.photo })));
      }

      const cachedImages: Record<string, string> = {};
      let hasCache = false;

      if (preloadedVariants.length > 0) {
        console.log('Using preloaded variants:', preloadedVariants.length);

        // Try to load cached images
        const useLocalCache = !order.paid;
        if (useLocalCache) {
          for (const variant of preloadedVariants) {
            try {
              const cachedImage = localStorage.getItem(`${CACHE_KEY_PREFIX}${variant.id}`);
              if (cachedImage && cachedImage.trim() !== '') {
                cachedImages[variant.id] = cachedImage;
                hasCache = true;
              }
            } catch (e) { }
          }
        }

        // Set variants from preloaded data
        setVariants(preloadedVariants);

        // If we have cached images, use them
        if (hasCache) {
          console.log('Using cached images for', Object.keys(cachedImages).length, 'variants');
          setRenderedImages(cachedImages);
          setProgress(Object.keys(cachedImages).length / preloadedVariants.length * 100);

          // If all images are cached, we're done
          if (Object.keys(cachedImages).length === preloadedVariants.length) {
            setIsGenerating(false);
            toast.success(`Loaded ${preloadedVariants.length} center variants from cache`);
          } else {
            // Start rendering from the first non-cached variant
            const startIndex = Object.keys(cachedImages).length;
            setCurrentRenderIndex(startIndex);
            setIsGenerating(true);
            console.log(`Starting to render from index ${startIndex}`);
          }
        } else {
          // No cached images, start rendering from the beginning
          setCurrentRenderIndex(0);
          setIsGenerating(true);
          console.log('No cached images, starting to render from beginning');
        }
      } else if (variants.length === 0) {
        generateVariants();
      }
    } else {
      // Reset state when modal closes
      setVariants([]);
      setRenderedImages({});
      setCurrentRenderIndex(0);
      setProgress(0);
      setIsGenerating(false);
      setError(null);
    }
  }, [open, preloadedVariants, isFetchedMode, fetchedVariants, fetchedRenderedImages]);

  const generateVariants = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setRenderedImages({});
    setCurrentRenderIndex(0);

    try {
      console.log('=== Generating variants for order:', order.id, '===');
      console.log('Order details:', {
        id: order.id,
        gridTemplate: order.gridTemplate,
        memberCount: order.members?.length || 0,
        members: order.members?.map(m => ({
          id: m.id,
          name: m.name,
          hasPhoto: !!(m.photo && m.photo.trim() !== ''),
          photoLength: m.photo?.length || 0,
          photoPreview: m.photo ? (m.photo.startsWith('data:') ? 'data:...' : m.photo.substring(0, 50) + '...') : 'no photo',
          photoIsDataUrl: m.photo?.startsWith('data:') || false
        })) || []
      });

      // Validate order data
      if (!order.members || !Array.isArray(order.members)) {
        throw new Error('Order members data is invalid or missing');
      }

      if (order.members.length === 0) {
        throw new Error('Order has no members');
      }

      if (!order.gridTemplate) {
        throw new Error('Order grid template is missing');
      }

      // Check members with photos
      const membersWithPhotos = order.members.filter(m => m.photo && m.photo.trim() !== '');
      console.log('Members with photos:', membersWithPhotos.length, 'out of', order.members.length);

      if (membersWithPhotos.length < 2) {
        throw new Error(`Not enough members with photos (${membersWithPhotos.length} found, need at least 2)`);
      }

      // Use preloaded variants if available
      let generatedVariants = preloadedVariants;

      // Generate variants if none were preloaded
      if (generatedVariants.length === 0) {
        console.log('Generating variants from order data...');
        generatedVariants = await generateGridVariants(order);
      }

      console.log('Generated variants:', generatedVariants.length, generatedVariants.map(v => v.centerMember.name));
      setVariants(generatedVariants);

      if (generatedVariants.length === 0) {
        setIsGenerating(false);
        setError('No variants could be generated');
        toast.error('No variants could be generated');
      } else {
        console.log('Starting to render variants...');
        // Reset state and ensure isGenerating is true to trigger rendering
        setCurrentRenderIndex(0);
        setProgress(0);
        setIsGenerating(true);
        console.log('Set isGenerating to true, currentRenderIndex to 0');
      }
    } catch (error) {
      console.error('Error generating variants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate variants';
      console.error('Error details:', {
        orderId: order.id,
        memberCount: order.members?.length,
        gridTemplate: order.gridTemplate,
        error: errorMessage
      });
      setError(errorMessage);
      toast.error(`Failed to generate variants: ${errorMessage}`);
      setIsGenerating(false);
    }
  };

  const handleVariantRendered = async (variantId: string, dataUrl: string) => {
    if (!dataUrl || dataUrl.trim() === '') {
      setCurrentRenderIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        setProgress(Math.min((newIndex / variants.length) * 100, 100));
        if (newIndex >= variants.length) {
          setIsGenerating(false);
          const cnt = Object.keys(renderedImages).length;
          if (cnt > 0) toast.success(`Generated ${cnt} of ${variants.length} center variants`);
          else { setError('Failed to render any variants.'); toast.error('Failed to render variants'); }
        }
        return newIndex;
      });
      return;
    }

    if (!order.paid) {
      try {
        localStorage.setItem(`${CACHE_KEY_PREFIX}${variantId}`, dataUrl);
      } catch (e) { /* ignore */ }
    }

    let imageUrl = dataUrl;
    if (order.paid) {
      try {
        const variant = variants.find(v => v.id === variantId);
        const filename = `variant-${(variant?.centerMember?.name || variantId).replace(/\s+/g, '-')}.png`;
        const file = dataURLToFile(dataUrl, filename);
        const result = await uploadToCloudinary(file, `center-variants/${order.id}`);
        imageUrl = result.secure_url;
        uploadedImagesRef.current[variantId] = imageUrl;
      } catch (err) {
        console.error('Cloudinary upload failed for', variantId, err);
        toast.error(`Failed to upload variant ${variantId}`);
      }
    }

    setRenderedImages(prev => ({ ...prev, [variantId]: imageUrl }));

    setCurrentRenderIndex(prevIndex => {
      const newIndex = prevIndex + 1;
      setProgress(Math.min((newIndex / variants.length) * 100, 100));

      if (newIndex >= variants.length) {
        setIsGenerating(false);
        const count = Object.keys({ ...renderedImages, [variantId]: imageUrl }).length;
        toast.success(`Generated ${count} center variants successfully`);

        if (order.paid && Object.keys(uploadedImagesRef.current).length > 0) {
          ordersApi.patchCenterVariants(order.id, {
            variants: variants.map(v => ({ id: v.id, centerMember: v.centerMember })),
            renderedImages: { ...uploadedImagesRef.current }
          }).then(() => onSavedToBackend?.()).catch(err => {
            console.error('Failed to save center variants:', err);
            toast.error('Variants generated but failed to save to server');
          });
        }
      }
      return newIndex;
    });
  };

  // Add timeout to handle stuck rendering - use refs to avoid dependency issues
  const lastRenderIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderedImagesRef = useRef<Record<string, string>>({});

  // Keep refs in sync with state
  useEffect(() => {
    lastRenderIndexRef.current = currentRenderIndex;
  }, [currentRenderIndex]);

  useEffect(() => {
    renderedImagesRef.current = renderedImages;
  }, [renderedImages]);

  // Ensure rendering starts if we have variants but no rendered images
  useEffect(() => {
    if (variants.length > 0 && Object.keys(renderedImages).length === 0 && !isGenerating && !error) {
      console.log('Auto-starting rendering: variants exist but no images rendered');
      setCurrentRenderIndex(0);
      setProgress(0);
      setIsGenerating(true);
    }
  }, [variants.length, renderedImages, isGenerating, error]);

  useEffect(() => {
    if (isGenerating && variants.length > 0 && currentRenderIndex < variants.length) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const startIndex = currentRenderIndex;
      const startTime = Date.now();

      // Set new timeout - this will fire if rendering doesn't progress
      timeoutRef.current = setTimeout(() => {
        // Check if we're still stuck at the same index
        if (lastRenderIndexRef.current === startIndex && startIndex < variants.length) {
          console.warn(`Rendering timeout for variant ${startIndex} (${variants[startIndex]?.centerMember?.name || 'unknown'}), moving to next...`);
          setCurrentRenderIndex(prev => {
            const newIndex = prev + 1;
            if (newIndex >= variants.length) {
              setIsGenerating(false);
              const renderedCount = Object.keys(renderedImagesRef.current).length;
              if (renderedCount > 0) {
                toast.success(`Generated ${renderedCount} of ${variants.length} center variants`);
              } else {
                setError('Failed to render any variants. Please check console for errors.');
                toast.error('Failed to render variants');
              }
            }
            return newIndex;
          });
        }
      }, 20000); // 20 second timeout per variant

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else {
      // Clear timeout if not generating
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isGenerating, currentRenderIndex, variants.length]);

  const handleDownloadSelected = (variantIds: string[]) => {
    if (variantIds.length === 0) {
      toast.error('No variants selected');
      return;
    }

    const downloadImage = (variantId: string) => {
      const imageData = renderedImages[variantId];
      const variant = variants.find(v => v.id === variantId);
      if (!imageData || !variant) return;

      const baseFilename = `grid-variant-${variant.centerMember.name.replace(/\s+/g, '-').toLowerCase()}`;

      let downloadUrl = imageData;

      // For Cloudinary URLs, add fl_attachment to force download with filename
      if (imageData.includes('cloudinary.com')) {
        const marker = imageData.includes('/image/upload/')
          ? '/image/upload/'
          : imageData.includes('/upload/')
            ? '/upload/'
            : null;

        if (marker) {
          downloadUrl = imageData.replace(
            marker,
            `${marker}fl_attachment:${baseFilename}/`
          );
        }
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${baseFilename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (variantIds.length === 1) {
      // Single download
      const variantId = variantIds[0];
      const imageData = renderedImages[variantId];
      const variant = variants.find(v => v.id === variantId);

      if (imageData && variant) {
        downloadImage(variantId);
        toast.success('Variant downloaded successfully');
      }
    } else {
      // Multiple downloads with delay
      toast.info(`Downloading ${variantIds.length} variants...`);

      variantIds.forEach((variantId, index) => {
        const imageData = renderedImages[variantId];
        const variant = variants.find(v => v.id === variantId);

        if (imageData && variant) {
          // Stagger downloads slightly to reduce browser blocking,
          // but keep the first one effectively within the user gesture.
          const delay = index === 0 ? 0 : index * 400;
          setTimeout(() => downloadImage(variantId), delay);
        }
      });
    }
  };

  const handleDownloadAll = () => {
    handleDownloadSelected(variants.map(v => v.id));
  };

  const handlePreview = (variant: GridVariant) => {
    // Preview handled by the gallery component
  };

  const handleRetry = () => {
    setVariants([]);
    setRenderedImages({});
    setCurrentRenderIndex(0);
    setProgress(0);
    generateVariants();
  };

  const handleClose = () => {
    setVariants([]);
    setRenderedImages({});
    setCurrentRenderIndex(0);
    setProgress(0);
    setIsGenerating(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Generate Center Variants</DialogTitle>
            {/* <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button> */}
          </div>
        </DialogHeader>

        {error ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        ) : isGenerating ? (
          <div className="text-center py-8 space-y-4">
            <h3 className="text-lg font-medium">Generating Center Variants...</h3>
            <Progress value={progress} className="max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">
              Rendered {Object.keys(renderedImages).length} of {variants.length} variants
            </p>
            {variants.length > 0 && currentRenderIndex < variants.length && (
              <p className="text-xs text-muted-foreground">
                Currently rendering: {variants[currentRenderIndex]?.centerMember?.name || 'Unknown'}
              </p>
            )}
          </div>
        ) : (isFetchedMode && (hasSquareVariants || hasHexVariants)) ? (
          // Show tabbed interface when we have server-rendered variants
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'square' | 'hexagonal')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="square" disabled={!hasSquareVariants} className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Square Grid ({fetchedVariants?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="hexagonal" disabled={!hasHexVariants} className="flex items-center gap-2">
                <Hexagon className="h-4 w-4" />
                Hexagonal Grid ({fetchedHexagonalVariants?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="square">
              {hasSquareVariants && fetchedVariants && fetchedRenderedImages && (
                <CenterVariantsGallery
                  variants={fetchedVariants}
                  renderedImages={fetchedRenderedImages}
                  onDownloadSelected={handleDownloadSelected}
                  onDownloadAll={handleDownloadAll}
                  onPreview={handlePreview}
                />
              )}
            </TabsContent>

            <TabsContent value="hexagonal">
              {hasHexVariants && fetchedHexagonalVariants && fetchedHexagonalRenderedImages && (
                <CenterVariantsGallery
                  variants={fetchedHexagonalVariants}
                  renderedImages={fetchedHexagonalRenderedImages}
                  onDownloadSelected={handleDownloadSelected}
                  onDownloadAll={handleDownloadAll}
                  onPreview={handlePreview}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : variants.length > 0 ? (
          // Client-side generation mode (for unpaid orders)
          <>
            <CenterVariantsGallery
              variants={variants}
              renderedImages={renderedImages}
              onDownloadSelected={handleDownloadSelected}
              onDownloadAll={handleDownloadAll}
              onPreview={handlePreview}
            />
            {/* Show progress if still generating in background */}
            {isGenerating && (
              <div className="text-center py-4 space-y-2 border-t mt-4">
                <Progress value={progress} className="max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Rendered {Object.keys(renderedImages).length} of {variants.length} variants
                </p>
                {variants.length > 0 && currentRenderIndex < variants.length && (
                  <p className="text-xs text-muted-foreground">
                    Currently rendering: {variants[currentRenderIndex]?.centerMember?.name || 'Unknown'}
                  </p>
                )}
              </div>
            )}
          </>
        ) : null}

        {/* Hidden renderers for generating images */}
        {(() => {
          const layout = getTemplateLayout(order.gridTemplate, order.members.length);
          // Map known layouts to our template keys used by VariantRenderer
          // 33 template (34/35 total cells including center) => '33'
          // 45 template (75 total cells including center)   => '45'
          const templateKey = layout && layout.totalCells === 19
            ? '19'
            : layout && layout.totalCells === 33
              ? '33'
              : layout && layout.totalCells === 34
                ? '34'
                : layout && layout.totalCells === 35
                  ? '35'
                  : layout && layout.totalCells === 36
                    ? '36'
                    : layout && layout.totalCells === 37
                      ? '37'
                      : layout && layout.totalCells === 38
                        ? '38'
                        : layout && layout.totalCells === 39
                          ? '39'
                          : layout && layout.totalCells === 40
                            ? '40'
                            : layout && layout.totalCells === 41
                              ? '41'
                              : layout && layout.totalCells === 42
                                ? '42'
                                : layout && layout.totalCells === 43
                                  ? '43'
                                  : layout && layout.totalCells === 44
                                    ? '44'
                                    : layout && layout.totalCells === 45
                                      ? '45'
                                      : layout && layout.totalCells === 46
                                        ? '46'
                                        : layout && layout.totalCells === 47
                                          ? '47'
                                          : layout && layout.totalCells === 48
                                            ? '48'
                                            : layout && layout.totalCells === 49
                                              ? '49'
                                              : layout && layout.totalCells === 50
                                                ? '50'
                                                : layout && layout.totalCells === 51
                                                  ? '51'
                                                  : layout && layout.totalCells === 52
                                                    ? '52'
                                                    : layout && layout.totalCells === 53
                                                      ? '53'
                                                      : layout && layout.totalCells === 54
                                                        ? '54'
                                                        : layout && layout.totalCells === 55
                                                          ? '55'
                                                          : layout && layout.totalCells === 56
                                                            ? '56'
                                                            : layout && layout.totalCells === 57
                                                              ? '57'
                                                              : layout && layout.totalCells === 58
                                                                ? '58'
                                                                : layout && layout.totalCells === 59
                                                                  ? '59'
                                                                  : layout && layout.totalCells === 60
                                                                    ? '60'
                                                                    : layout && layout.totalCells === 61
                                                                      ? '61'
                                                                      : layout && layout.totalCells === 62
                                                                        ? '62'
                                                                        : layout && layout.totalCells === 63
                                                                          ? '63'
                                                                          : layout && layout.totalCells === 64
                                                                            ? '64'
                                                                            : layout && layout.totalCells === 65
                                                                              ? '65'
                                                                              : layout && layout.totalCells === 66
                                                                                ? '66'
                                                                                : layout && layout.totalCells === 67
                                                                                  ? '67'
                                                                                  : layout && layout.totalCells === 68
                                                                                    ? '68'
                                                                                    : layout && layout.totalCells === 69
                                                                                      ? '69'
                                                                                      : layout && layout.totalCells === 70
                                                                                        ? '70'
                                                                                        : layout && layout.totalCells === 71
                                                                                          ? '71'
                                                                                          : layout && layout.totalCells === 72
                                                                                            ? '72'
                                                                                            : layout && layout.totalCells === 73
                                                                                              ? '73'
                                                                                              : layout && layout.totalCells === 74
                                                                                                ? '74'
                                                                                                : layout && layout.totalCells === 75
                                                                                                  ? '75'
                                                                                                  : layout && layout.totalCells === 76
                                                                                                    ? '76'
                                                                                                    : layout && layout.totalCells === 77
                                                                                                      ? '77'
                                                                                                      : layout && layout.totalCells === 78
                                                                                                        ? '78'
                                                                                                        : layout && layout.totalCells === 79
                                                                                                          ? '79'
                                                                                                          : layout && layout.totalCells === 80
                                                                                                            ? '80'
                                                                                                            : layout && layout.totalCells === 81
                                                                                                              ? '81'
                                                                                                              : layout && layout.totalCells === 82
                                                                                                                ? '82'
                                                                                                                : layout && layout.totalCells === 83
                                                                                                                  ? '83'
                                                                                                                  : layout && layout.totalCells === 84
                                                                                                                    ? '84'
                                                                                                                    : layout && layout.totalCells === 85
                                                                                                                      ? '85'
                                                                                                                      : layout && layout.totalCells === 86
                                                                                                                        ? '86'
                                                                                                                        : layout && layout.totalCells === 87
                                                                                                                          ? '87'
                                                                                                                          : layout && layout.totalCells === 88
                                                                                                                            ? '88'
                                                                                                                            : layout && layout.totalCells === 89
                                                                                                                              ? '89'
                                                                                                                              : layout && layout.totalCells === 90
                                                                                                                                ? '90'
                                                                                                                                : layout && layout.totalCells === 91
                                                                                                                                  ? '91'
                                                                                                                                  : layout && layout.totalCells === 92
                                                                                                                                    ? '92'
                                                                                                                                    : layout && layout.totalCells === 93
                                                                                                                                      ? '93'
                                                                                                                                      : layout && layout.totalCells === 94
                                                                                                                                        ? '94'
                                                                                                                                        : layout && layout.totalCells === 95
                                                                                                                                          ? '95'
                                                                                                                                          : layout && layout.totalCells === 96
                                                                                                                                            ? '96'
                                                                                                                                            : '45';

          // Render VariantRenderer components for variants that haven't been rendered yet
          const renderedCount = Object.keys(renderedImages).length;
          const needsRendering = renderedCount < variants.length;

          // Determine if we should use hexagonal renderer
          const effectiveGridType = gridType || (order.gridTemplate === 'hexagonal' ? 'hexagonal' : 'square');
          const useHexRenderer = effectiveGridType === 'hexagonal';

          return variants.map((variant, index) => {
            // Skip if already rendered
            if (renderedImages[variant.id]) {
              return null;
            }

            // Render the current index being processed (always render if needsRendering, regardless of isGenerating state)
            // This ensures rendering continues even if state hasn't fully propagated
            const shouldRender = index === currentRenderIndex && needsRendering;
            if (!shouldRender) return null;

            console.log(`[CenterVariantsModal] Rendering variant ${index + 1}/${variants.length}:`, variant.id, variant.centerMember.name, 'isGenerating:', isGenerating, 'useHexRenderer:', useHexRenderer);

            // Use HexagonVariantRenderer for hexagonal grids
            if (useHexRenderer) {
              return (
                <HexagonVariantRenderer
                  key={`hex-${variant.id}-${index}-${currentRenderIndex}`}
                  order={order}
                  variant={variant}
                  onRendered={handleVariantRendered}
                />
              );
            }

            return (
              <VariantRenderer
                key={`${variant.id}-${index}-${currentRenderIndex}`}
                order={order}
                variant={variant}
                onRendered={handleVariantRendered}
                templateKey={templateKey}
              />
            );
          });
        })()}
      </DialogContent>
    </Dialog>
  );
};
