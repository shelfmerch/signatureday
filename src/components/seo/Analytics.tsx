declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const Analytics = () => {
  return null;
};

export default Analytics;
