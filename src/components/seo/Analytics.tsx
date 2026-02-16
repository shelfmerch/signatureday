import { useEffect } from 'react';

// Extend Window interface
declare global {
  interface Window {
    dataLayer: any[];
  }
}

const Analytics = () => {
  useEffect(() => {
    // Initialize Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXX-X`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) { 
      window.dataLayer.push(args); 
    }
    gtag('js', new Date());
    gtag('config', 'UA-XXXXXXX-X');

    // Initialize other analytics services as needed

    // Cleanup
    return () => {
      const scripts = document.querySelectorAll(
        'script[src^="https://www.googletagmanager.com/gtag/js"]'
      );
      scripts.forEach(script => script.remove());
    };
  }, []);

  return null;
};

export default Analytics;
