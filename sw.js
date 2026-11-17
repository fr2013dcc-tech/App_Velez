// Quick Ruteo · Cueros Vélez — service worker: la app abre sin señal; la API nunca se guarda en caché.
// Usa nombres de caché propios (cv-…): comparte dominio con la app de la clínica y NO debe borrar sus cachés.
const VERSION = 'cv-v1';   // súbela (cv-v2, cv-v3…) cada vez que cambies index.html ya instalado en los celulares
const BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(BASE.map(u => c.add(u).catch(err => console.warn('SW: no se pudo guardar', u, err)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Solo borra versiones anteriores de ESTA app (cv-v…); nunca las cachés de otras apps del mismo dominio
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^cv-v\d+$/.test(k) && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || /script\.google(usercontent)?\.com$/.test(u.hostname)) return;
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('cv-tiles').then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) { c.put(e.request, r.clone()); c.keys().then(k => { if (k.length > 600) k.slice(0, 100).forEach(x => c.delete(x)); }); }
      return r;
    }).catch(() => Response.error()));
    return;
  }
  // admin.html y consulta.html no se guardan: siempre en línea
  if (/\/(admin|consulta)\.html$/.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com')) caches.open(VERSION).then(c => c.put(e.request, r.clone()));
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window'}).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
