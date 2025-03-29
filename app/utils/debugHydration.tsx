"use client";

import { useEffect } from 'react';

/**
 * Debug utility for hydration errors
 * Attach this component to your layout or specific pages where you're experiencing hydration errors
 * Only runs in development mode
 */
function HydrationDebugger() {
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log('[HydrationDebugger] Component mounted, setting up mutation observer for hydration errors');
    
    // Create a mutation observer to detect DOM changes after hydration
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check for attribute changes
        if (mutation.type === 'attributes') {
          console.log(`[HydrationDebugger] Attribute '${mutation.attributeName}' changed on:`, mutation.target);
        }
        
        // Check for DOM structure changes
        if (mutation.type === 'childList') {
          if (mutation.addedNodes.length) {
            console.log('[HydrationDebugger] Nodes added:', mutation.addedNodes);
          }
          if (mutation.removedNodes.length) {
            console.log('[HydrationDebugger] Nodes removed:', mutation.removedNodes);
          }
        }
      }
    });
    
    // Start observing the entire document
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Clean up
    return () => {
      console.log('[HydrationDebugger] Disconnecting observer');
      observer.disconnect();
    };
  }, []);
  
  // Return null as this is just a utility that doesn't render anything
  return null;
}

/**
 * Helper function to identify React components with hydration issues
 * Call this function in the component suspected of causing hydration errors
 */
export function logHydrationPoint(componentName: string, props?: any) {
  if (process.env.NODE_ENV !== 'development') return;
  
  useEffect(() => {
    console.log(`[HydrationDebugger] Component '${componentName}' hydrated`, props);
  }, [componentName, props]);
}

/**
 * High Order Component (HOC) to wrap components for hydration debugging
 */
export function withHydrationDebugging<P extends object>(
  Component: React.ComponentType<P>,
  debugName: string
) {
  return function WrappedComponent(props: P) {
    logHydrationPoint(debugName, props);
    return <Component {...props} />;
  };
}

// Экспортируем по умолчанию для совместимости
export default HydrationDebugger; 