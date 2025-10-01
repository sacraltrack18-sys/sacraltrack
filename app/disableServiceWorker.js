"use client";

// This script safely unregisters service worker without causing hydration issues
if (typeof window !== 'undefined') {
  // Using an effect-like approach to delay execution until after hydration
  const unregisterServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('ServiceWorker unregistered');
        });
      }).catch(error => {
        console.error('Error unregistering service worker:', error);
      });
    }
  };
  
  // Delay execution until after hydration is complete
  if (document.readyState === 'complete') {
    unregisterServiceWorker();
  } else {
    window.addEventListener('load', unregisterServiceWorker);
  }
} 