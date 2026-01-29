// BirdGame Service Worker
const CACHE_NAME = 'birdgame-v1.0.0';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/game.js',
    '/js/world.js',
    '/js/bird.js',
    '/js/locations.js',
    '/js/weather.js',
    '/js/effects.js',
    '/js/worms.js',
    '/js/flies.js',
    '/js/audio.js',
    '/js/ui.js',
    '/js/touch.js',
    '/js/network.js',
    '/js/progression.js',
    '/js/rewards.js',
    '/manifest.json'
];

const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

const ALL_ASSETS = [...STATIC_ASSETS, ...EXTERNAL_ASSETS];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(ALL_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Skip waiting');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[ServiceWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    // Update cache in background (stale-while-revalidate)
                    fetchAndCache(event.request);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetchAndCache(event.request);
            })
            .catch(() => {
                // Return offline fallback for HTML pages
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            })
    );
});

// Helper to fetch and cache
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);

        // Only cache successful responses
        if (response.ok && response.status === 200) {
            const responseType = response.type;
            // Don't cache opaque responses (cross-origin without CORS)
            if (responseType !== 'opaque') {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, response.clone());
            }
        }

        return response;
    } catch (error) {
        console.error('[ServiceWorker] Fetch failed:', error);
        throw error;
    }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
