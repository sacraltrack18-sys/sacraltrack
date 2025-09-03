"use client";

import { useEffect } from 'react';

interface PreloadResource {
  href: string;
  as: string;
  type?: string;
}

export default function ResourcePreloader() {
  useEffect(() => {
    // Preload critical CSS and JS chunks
    const preloadResources: (string | PreloadResource)[] = [
      // Critical fonts (if any)
      // { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
      
      // Critical images that appear on most pages
      '/favicon.svg',
      '/favicon.ico',
      
      // Next.js chunks that are used frequently
      // These will be determined by build analysis
    ];

    preloadResources.forEach(resource => {
      if (typeof resource === 'string') {
        // Simple image preload
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = resource;
        document.head.appendChild(link);
      } else {
        // Complex resource preload
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        if (resource.type) link.type = resource.type;
        if (resource.as === 'font') link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // Preload next page on hover (intersection observer)
    const preloadOnHover = () => {
      const links = document.querySelectorAll('a[href^="/"]');
      
      links.forEach(link => {
        const handleMouseEnter = () => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            // Create invisible link to trigger Next.js prefetch
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = href;
            document.head.appendChild(prefetchLink);
          }
        };

        link.addEventListener('mouseenter', handleMouseEnter, { once: true });
      });
    };

    // Delay preload setup to not block initial render
    setTimeout(preloadOnHover, 2000);

    // DNS prefetch for external domains
    const externalDomains = [
      'https://cloud.appwrite.io',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

  }, []);

  return null;
}
