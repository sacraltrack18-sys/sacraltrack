// Basic Service Worker for Sacral Track
// Version 1.0 - Foundation for caching and performance

const CACHE_NAME = 'sacral-track-v1';
const STATIC_CACHE = 'static-v1';
const AUDIO_CACHE = 'audio-v1';
const IMAGE_CACHE = 'images-v1';

// Static resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete old caches
              return cacheName !== STATIC_CACHE && 
                     cacheName !== AUDIO_CACHE && 
                     cacheName !== IMAGE_CACHE;
            })
            .map(cacheName => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isImageRequest(event.request)) {
    event.respondWith(handleImageRequest(event.request));
  } else if (isAudioRequest(event.request)) {
    event.respondWith(handleAudioRequest(event.request));
  } else if (isStaticResource(event.request)) {
    event.respondWith(handleStaticRequest(event.request));
  } else {
    // Default: network first for dynamic content
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  }
});

// Image requests - Cache First strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('🖼️ Image from cache:', request.url.split('/').pop());
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful image responses
      await cache.put(request, response.clone());
      console.log('🖼️ Image cached:', request.url.split('/').pop());
    }
    return response;
  } catch (error) {
    console.log('❌ Image request failed:', error);
    throw error;
  }
}

// Audio requests - Cache First with smart caching
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('🎵 Audio from cache:', request.url.split('/').pop());
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Smart caching - cache audio segments but limit size
      await smartCacheAudio(cache, request, response.clone());
      console.log('🎵 Audio cached:', request.url.split('/').pop());
    }
    return response;
  } catch (error) {
    console.log('❌ Audio request failed:', error);
    throw error;
  }
}

// Static resources - Cache First strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/offline.html') || new Response('Offline');
  }
}

// Smart audio caching with size limits
async function smartCacheAudio(cache, request, response) {
  const keys = await cache.keys();
  const MAX_AUDIO_ITEMS = 50; // Limit cache size
  
  if (keys.length >= MAX_AUDIO_ITEMS) {
    // Remove oldest cached audio
    const oldestKey = keys[0];
    await cache.delete(oldestKey);
    console.log('🗑️ Removed old audio cache:', oldestKey.url.split('/').pop());
  }
  
  await cache.put(request, response);
}

// Helper functions to identify request types
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(new URL(request.url).pathname);
}

function isAudioRequest(request) {
  return request.destination === 'audio' || 
         /\.(mp3|wav|ogg|aac|m4a|ts)$/i.test(new URL(request.url).pathname) ||
         request.url.includes('storage/buckets') || // Appwrite storage
         request.url.includes('.m3u8'); // HLS playlists
}

function isStaticResource(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         /\.(js|css|woff|woff2|ttf)$/i.test(url.pathname);
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  let totalItems = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    totalItems += keys.length;
  }
  
  return {
    caches: cacheNames.length,
    totalItems,
    version: CACHE_NAME
  };
}

console.log('🎵 Sacral Track Service Worker loaded');