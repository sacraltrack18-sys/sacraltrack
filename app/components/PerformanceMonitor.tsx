"use client";

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    // Web Vitals monitoring
    const reportWebVitals = (metric: any) => {
      // Send to Google Analytics if available
      if (window.gtag) {
        window.gtag('event', metric.name, {
          custom_map: { metric_id: 'custom_metric' },
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
        });
      }

      // Log important metrics
      if (metric.name === 'LCP' && metric.value > 2500) {
        console.warn('🐌 Slow LCP detected:', metric.value + 'ms');
      }
      if (metric.name === 'FID' && metric.value > 100) {
        console.warn('🐌 Slow FID detected:', metric.value + 'ms');
      }
      if (metric.name === 'CLS' && metric.value > 0.1) {
        console.warn('🐌 High CLS detected:', metric.value);
      }
      if (metric.name === 'INP' && metric.value > 200) {
        console.warn('🐌 Slow INP detected:', metric.value + 'ms');
      }
    };

    // Import and register web vitals (modern API only)
    import('web-vitals').then((vitals: any) => {
      // Use modern API with type safety
      if (vitals.onCLS) vitals.onCLS(reportWebVitals);
      if (vitals.onFID) vitals.onFID(reportWebVitals);
      if (vitals.onFCP) vitals.onFCP(reportWebVitals);
      if (vitals.onLCP) vitals.onLCP(reportWebVitals);
      if (vitals.onTTFB) vitals.onTTFB(reportWebVitals);
      if (vitals.onINP) vitals.onINP(reportWebVitals);
      
      console.log('📊 Web Vitals monitoring enabled');
    }).catch(() => {
      // Fallback if web-vitals is not available
      console.log('📊 Web Vitals not available, using basic performance monitoring');
    });

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Log slow page loads
          if (navEntry.loadEventEnd - navEntry.loadEventStart > 3000) {
            console.warn('🐌 Slow page load:', navEntry.loadEventEnd - navEntry.loadEventStart + 'ms');
          }
        }
        
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Log slow resource loads
          if (resourceEntry.duration > 1000) {
            console.warn('🐌 Slow resource:', resourceEntry.name, resourceEntry.duration + 'ms');
          }
        }
      });
    });

    // Observe navigation and resource timings
    try {
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.log('📊 Performance Observer not supported');
    }

    // Memory usage monitoring (if available)
    if ('memory' in performance && typeof (performance as any).memory === 'object') {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
        
        if (usedMB > limitMB * 0.8) {
          console.warn('🧠 High memory usage:', usedMB + 'MB / ' + limitMB + 'MB');
        }
      };

      const memoryInterval = setInterval(checkMemory, 30000); // Check every 30 seconds
      
      return () => {
        clearInterval(memoryInterval);
        observer.disconnect();
      };
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
}
