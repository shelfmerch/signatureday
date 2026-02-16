import React, { useEffect, useRef, useState } from 'react';
import { Order } from '@/types/admin';
import { generateGridVariants, GridVariant, getTemplateLayout } from '@/utils/gridVariantGenerator';
import { VariantRenderer } from './VariantRenderer';
import { canGenerateVariants } from '@/utils/gridCenterUtils';
import { dataURLToFile, uploadToCloudinary } from '@/lib/cloudinary';
import { ordersApi } from '@/lib/api';

interface CenterVariantsBackgroundGeneratorProps {
  order: Order;
  runBackground: boolean;
  onComplete: () => void;
}

/**
 * Generates center variants in the background when order is paid.
 * Renders hidden VariantRenderer components, uploads to Cloudinary, saves to backend.
 */
export const CenterVariantsBackgroundGenerator: React.FC<CenterVariantsBackgroundGeneratorProps> = ({
  order,
  runBackground,
  onComplete,
}) => {
  const [variants, setVariants] = useState<GridVariant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const uploadedRef = useRef<Record<string, string>>({});
  const startedRef = useRef(false);

  const { canGenerate } = canGenerateVariants(order);
  const alreadyHasData = (order.centerVariantImages?.length ?? 0) > 0;
  const shouldRun = runBackground && order.paid && canGenerate && !alreadyHasData;

  useEffect(() => {
    if (!shouldRun || startedRef.current) return;

    let cancelled = false;
    startedRef.current = true;

    (async () => {
      try {
        const v = await generateGridVariants(order);
        if (cancelled || v.length === 0) return;
        setVariants(v);
        setCurrentIndex(0);
      } catch (err) {
        console.error('[BackgroundGenerator] Failed to generate variants:', err);
        startedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldRun, order.id]);

  const handleRendered = async (variantId: string, dataUrl: string) => {
    if (!dataUrl?.trim()) {
      setCurrentIndex(i => {
        if (i + 1 >= variants.length) {
          startedRef.current = false;
          onComplete();
        }
        return i + 1;
      });
      return;
    }

    try {
      const variant = variants.find(v => v.id === variantId);
      const filename = `variant-${(variant?.centerMember?.name || variantId).replace(/\s+/g, '-')}.png`;
      const file = dataURLToFile(dataUrl, filename);
      const result = await uploadToCloudinary(file, `center-variants/${order.id}`);
      uploadedRef.current[variantId] = result.secure_url;
    } catch (err) {
      console.error('[BackgroundGenerator] Upload failed for', variantId, err);
    }

    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= variants.length) {
        const toSave = uploadedRef.current;
        if (Object.keys(toSave).length > 0) {
          ordersApi.patchCenterVariants(order.id, {
            variants: variants.map(v => ({ id: v.id, centerMember: v.centerMember })),
            renderedImages: toSave
          }).then(() => {
            onComplete();
          }).catch(err => {
            console.error('[BackgroundGenerator] PATCH failed:', err);
          });
        }
        startedRef.current = false;
      }
      return next;
    });
  };

  if (!shouldRun || variants.length === 0 || currentIndex >= variants.length) return null;

  const layout = getTemplateLayout(order.gridTemplate, order.members.length);
  const templateKey = layout?.totalCells ? String(layout.totalCells) : '45';
  const variant = variants[currentIndex];

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: -9999,
        top: 0,
        width: 1,
        height: 1,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <VariantRenderer
        key={variant.id}
        order={order}
        variant={variant}
        onRendered={handleRendered}
        templateKey={templateKey}
      />
    </div>
  );
};
