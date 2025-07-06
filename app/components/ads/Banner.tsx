"use client";

import { useEffect, useRef } from 'react';

interface BannerProps {
  className?: string;
  isMobile?: boolean;
}

export default function Banner({ className = '', isMobile = false }: BannerProps) {
  const banner = useRef<HTMLDivElement>(null);

  const atOptions = {
    key: '0654df9f27dd77270cf8f1aaeed1818a',
    format: 'iframe',
    height: isMobile ? 100 : 250,
    width: 300,
    params: {},
  };

  useEffect(() => {
    if (banner.current && !banner.current.firstChild) {
      const conf = document.createElement('script');
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `//www.highperformanceformat.com/${atOptions.key}/invoke.js`;
      conf.innerHTML = `atOptions = ${JSON.stringify(atOptions)}`;

      banner.current.appendChild(conf);
      banner.current.appendChild(script);
    }
  }, [banner]);

  return (
    <div 
      className={`mx-2 my-5 border border-gray-200 justify-center items-center text-white text-center ${className}`}
      ref={banner}
      style={{
        minHeight: atOptions.height,
        minWidth: atOptions.width
      }}
    />
  );
}
