// >>> Sube el número de versión en cada despliegue
const STATIC_CACHE  = 'static-v3';
const RUNTIME_CACHE = 'runtime-v1';

// Rutas estáticas esenciales (se sirven cache-first)
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './app-tournament.js',
  './manifest.json',
  // agrega aquí íconos o fuentes si las usas
];

// Detecta “datos de torneo” que deben ir siempre frescos
function isTournamentData(url) {
  // Ajusta si tus rutas son distintas (ej: /Web/OTS/1.txt)
  return /\/1\.txt$/i.test(url.pathname)
      || /\.tournament$/i.test(url.pathname);
}

// --- Helpers de estrategias ---
async function networkFirst(request) {
  // cache-busting para evitar capas intermedias
  const bust = Date.now();
  const url  = new URL(request.url);
  url.searchParams.set('sw_cb', bust);

  try {
    const fresh = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    });
    // Guarda copia por si luego estamos offline
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    // Fallback a caché si no hay red
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, resp.clone());
  return resp;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(resp => {
    cache.put(request, resp.clone());
    return resp;
  }).catch(() => null);

  // Devuelve rápido el caché y actualiza en segundo plano
  return cached || fetchPromise || fetch(request);
}

// --- Ciclo de vida SW ---
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) Datos de torneo SIEMPRE network-first (1.txt, *.Tournament)
  if (isTournamentData(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2) Archivos estáticos conocidos (cache-first)
  if (STATIC_ASSETS.some(p => url.pathname.endsWith(p.replace('./', '/')))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3) Resto: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});
