// Service worker: deixa o app abrir sem internet (a gravação continua exigindo conexão).
const CACHE = 'lu-salgados-v2';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // as chamadas ao servidor são POST: nunca em cache
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Arquivos do app: tenta a rede (para pegar atualizações) e cai no cache se estiver sem internet
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Fontes: usa o cache e atualiza em segundo plano
    e.respondWith(caches.match(req).then(hit => {
      const rede = fetch(req).then(r => { caches.open(CACHE).then(k => k.put(req, r.clone())); return r; }).catch(() => hit);
      return hit || rede;
    }));
  }
});
