/* BudgetPT — service worker: cache "stale-while-revalidate".
   Serve da cache (rápido/offline) e atualiza em fundo — as
   atualizações da app aparecem na abertura seguinte. */
const CACHE = 'budgetpt-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // a sincronização com o Apps Script nunca passa pela cache
  if (e.request.url.includes('script.google')) return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const cached = await c.match(e.request);
      const network = fetch(e.request)
        .then(r => {
          if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
          return r;
        })
        .catch(() => null);
      if (cached) { network; return cached; } // devolve cache, atualiza em fundo
      const fresh = await network;
      return fresh || new Response('Sem ligação e sem cache.', { status: 503 });
    })
  );
});
