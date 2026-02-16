import { useEffect } from 'react';

const PerformanceOptimizer = () => {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical fonts - disabled to prevent unused warnings
      // const fontLink = document.createElement('link');
      // fontLink.rel = 'preload';
      // fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      // fontLink.as = 'style';
      // document.head.appendChild(fontLink);

      // Preload critical images - disabled to prevent unused warnings
      // const criticalImages = [
      //   '/images/step1.svg',
      //   '/images/step2.svg', 
      //   '/images/step3.svg',
      //   '/og-image.png'
      // ];

      // criticalImages.forEach(src => {
      //   const link = document.createElement('link');
      //   link.rel = 'preload';
      //   link.href = src;
      //   link.as = 'image';
      //   document.head.appendChild(link);
      // });
    };

    // Add resource hints for external domains
    const addResourceHints = () => {
      const hints = [
        { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }
      ];

      hints.forEach(hint => {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        if (hint.crossorigin) {
          link.crossOrigin = hint.crossorigin;
        }
        document.head.appendChild(link);
      });
    };

    // Optimize images with lazy loading
    const optimizeImages = () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.loading) {
          img.loading = 'lazy';
        }
        if (!img.decoding) {
          img.decoding = 'async';
        }
      });
    };

    // Add performance monitoring
    const addPerformanceMonitoring = () => {
      // Core Web Vitals monitoring
      if ('web-vital' in window) {
        // This would be implemented with web-vitals library
        console.log('Performance monitoring initialized');
      }

      // Basic performance metrics
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        console.log('Page Load Time:', navigation.loadEventEnd - navigation.loadEventStart);
        console.log('DOM Content Loaded:', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);

        if (paint.length > 0) {
          console.log('First Paint:', paint[0].startTime);
        }
      });
    };

    // Initialize all optimizations
    preloadCriticalResources();
    addResourceHints();
    optimizeImages();
    addPerformanceMonitoring();

    // Cleanup function
    return () => {
      // Remove any added elements if needed
    };
  }, []);

  return null;
};

export default PerformanceOptimizer;
