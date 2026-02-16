import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { generateGridVariants, getTemplateLayout } from '@/utils/gridVariantGenerator';
import { VariantRenderer } from '@/components/admin/VariantRenderer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Timeout for initial data fetch (30s)
const FETCH_TIMEOUT_MS = 30000;
// Timeout for rendering (45s)
const RENDER_TIMEOUT_MS = 45000;

const RenderCanvas: React.FC = () => {
  const { orderId, variantId } = useParams<{ orderId: string; variantId: string }>();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('initializing');
  const [variant, setVariant] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  
  const renderTimeoutRef = useRef<number | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);

  const onRendered = useCallback((id: string, url: string) => {
    console.log('[RenderCanvas] Variant rendered:', id, url?.substring(0, 50));
    
    // Clear render timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }
    
    if (url && url.startsWith('data:image')) {
      setDataUrl(url);
      setStatus('complete');
    } else {
      setError('Invalid image data URL received');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const run = async () => {
      try {
        if (!orderId || !variantId) {
          throw new Error('Order ID or variant ID missing');
        }
        
        setStatus('fetching-order');
        console.log('[RenderCanvas] Fetching order:', orderId);

        // Create abort controller for fetch
        fetchControllerRef.current = new AbortController();
        const fetchTimeout = setTimeout(() => {
          fetchControllerRef.current?.abort();
        }, FETCH_TIMEOUT_MS);

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const url = `${API_BASE}/render/order/${encodeURIComponent(orderId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        const res = await fetch(url, { 
          method: 'GET', 
          credentials: 'include',
          signal: fetchControllerRef.current.signal
        });
        
        clearTimeout(fetchTimeout);

        if (!mounted) return;

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Order fetch failed: ${res.status} - ${text}`);
        }
        
        const orderData = await res.json();
        console.log('[RenderCanvas] Order fetched, members:', orderData.members?.length);
        
        if (!orderData.members || orderData.members.length === 0) {
          throw new Error('Order has no members');
        }
        
        setOrder(orderData);
        setStatus('generating-variants');

        // Generate variants
        const variants = generateGridVariants(orderData);
        console.log('[RenderCanvas] Generated variants:', variants.length);
        
        if (!variants || variants.length === 0) {
          throw new Error('No variants could be generated');
        }

        const v = variants.find((x) => x.id === variantId);
        if (!v) {
          const availableIds = variants.map(x => x.id).join(', ');
          throw new Error(`Variant ${variantId} not found. Available: ${availableIds}`);
        }
        
        console.log('[RenderCanvas] Found variant:', v.id, 'centerMember:', v.centerMember?.name);
        
        if (!mounted) return;
        
        setVariant(v);
        setStatus('rendering');
        
        // Set render timeout
        renderTimeoutRef.current = window.setTimeout(() => {
          if (mounted && !dataUrl) {
            setError(`Render timeout after ${RENDER_TIMEOUT_MS / 1000}s`);
          }
        }, RENDER_TIMEOUT_MS);

      } catch (err: any) {
        if (!mounted) return;
        
        console.error('[RenderCanvas] Error:', err);
        
        if (err.name === 'AbortError') {
          setError(`Fetch timeout after ${FETCH_TIMEOUT_MS / 1000}s`);
        } else {
          setError(err.message || 'Unknown error');
        }
      }
    };

    run();

    return () => {
      mounted = false;
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [orderId, variantId]);

  // Error state
  if (error) {
    return (
      <div id="error" data-error={error}>
        Error: {error}
      </div>
    );
  }

  // Complete state - show rendered image
  if (dataUrl) {
    return (
      <div>
        <img 
          id="rendered-image" 
          src={dataUrl} 
          alt="Rendered variant" 
          style={{ display: 'block', maxWidth: '100%' }} 
        />
        <div id="render-complete" data-variant-id={variantId} />
      </div>
    );
  }

  // Loading/rendering state
  if (!order || !variant) {
    return (
      <div id="loading" data-status={status}>
        Status: {status}
        {status === 'fetching-order' && <span> (fetching order data...)</span>}
        {status === 'generating-variants' && <span> (generating variant list...)</span>}
      </div>
    );
  }

  // Rendering in progress
  const layout = getTemplateLayout(order.gridTemplate, order.members.length);
  const templateKey = layout?.totalCells ? String(layout.totalCells) : '45';

  return (
    <div>
      <div id="rendering" data-status={status}>
        Status: rendering variant {variantId}
      </div>
      <div 
        style={{ 
          position: 'fixed', 
          left: 0, 
          top: 0, 
          width: 2550, 
          height: 3300, 
          zIndex: -1, 
          opacity: 0, 
          pointerEvents: 'none' 
        }}
      >
        <VariantRenderer
          order={order}
          variant={variant}
          onRendered={onRendered}
          templateKey={templateKey}
        />
      </div>
    </div>
  );
};

export default RenderCanvas;
