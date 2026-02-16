import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

/**
 * LazyImage component that loads images only when they enter the viewport
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholderSrc = '/placeholder.svg',
  width,
  height,
  onLoad,
  onError,
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer to detect when image enters viewport
  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '100px', // Load images 100px before they enter viewport
        threshold: 0.1
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Start loading image when it enters the viewport
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setIsLoaded(true);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setError(true);
      if (onError) onError();
    };

    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, onLoad, onError]);

  // Determine which source to show
  const imageSrc = isLoaded ? src : placeholderSrc;
  
  // Apply blur effect while loading
  const imageStyle = {
    filter: isLoaded ? 'none' : 'blur(10px)',
    transition: 'filter 0.3s ease-out',
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <img
        ref={imgRef}
        src={error ? placeholderSrc : imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-60'}`}
        style={imageStyle}
        onClick={onClick}
      />
      
      {/* Loading spinner */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent border-purple-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
          <div className="text-xs text-gray-500">Failed to load</div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;

