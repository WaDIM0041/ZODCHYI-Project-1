
const CACHE_NAME = 'zodchiy-v1.9.1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => {
      console.log('Zodchiy: Caching shell assets');
      return c.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-first strategy for dynamic content, Cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // API calls and Cloud Sync should never be cached via SW (GitHub API handles its own headers)
  if (url.hostname.includes('api.github.com') || url.pathname.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
