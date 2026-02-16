import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { generateGridVariants } from '@/utils/gridVariantGenerator';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const RenderBootstrap = () => {
  const { orderId } = useParams();
  const [variants, setVariants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndGenerate = async () => {
      try {
        if (!orderId) throw new Error('Order ID missing');

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const url = `${API_BASE}/render/order/${encodeURIComponent(orderId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error(`Order fetch failed: ${res.status}`);
        const order = await res.json();

        const generated = await generateGridVariants(order);
        setVariants(generated);
      } catch (err: any) {
        console.error('Bootstrap error:', err);
        setError(err.message);
      }
    };

    fetchAndGenerate();
  }, [orderId]);

  if (error) return <div id="error">{error}</div>;
  return (
    <div id="variant-data" data-ready={variants.length > 0 ? 'true' : 'false'} style={{ whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(variants, null, 2)}
    </div>
  );
};

export default RenderBootstrap;
