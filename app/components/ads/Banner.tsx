import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adKey: string;
  adHeight: number;
  adWidth: number;
}

const Banner: React.FC<AdBannerProps> = ({ adKey, adHeight, adWidth }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adKey || !containerRef.current) return;

    const scriptOptions = document.createElement('script');
    scriptOptions.type = 'text/javascript';
    scriptOptions.innerHTML = `
      atOptions = {
        key: '${adKey}',
        format: 'iframe',
        height: ${adHeight},
        width: ${adWidth},
        params: {}
      };
    `;

    const scriptSrc = document.createElement('script');
    scriptSrc.type = 'text/javascript';
    scriptSrc.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
    scriptSrc.async = true; // for better performance

    containerRef.current.appendChild(scriptOptions);
    containerRef.current.appendChild(scriptSrc);

    // Cleanup function to remove scripts on unmount
    return () => {
      containerRef.current.removeChild(scriptOptions);
      containerRef.current.removeChild(scriptSrc);
    };
  }, [adKey, adHeight, adWidth, containerRef]);

  return (
    <div ref={containerRef} style={{ width: `${adWidth}px`, height: `${adHeight}px` }}></div>
  );
};

export default Banner;
