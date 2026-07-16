/* Service worker: cache app shell for offline use on the floor. */
const CACHE = 'golden-qa-v16';
const SHELL = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];
// Cache each shell entry independently so one failure (e.g. the opaque cross-origin Chart.js
// response, or being offline at install) can't abort precaching the rest of the app shell.
// addAll() rejects atomically on any failure; allSettled() does not.
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>
  Promise.allSettled(SHELL.map(u=>c.add(new Request(u,{mode:u.startsWith('http')?'no-cors':'same-origin'}))))
).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const u = new URL(e.request.url);
  // Cross-origin, network-only (except the Chart.js CDN shell entry): never intercept Clerk's
  // script/auth calls or Supabase Storage, so the SW can't serve a stale token or break sign-in.
  if (u.origin !== self.location.origin && !u.href.startsWith('https://cdnjs.cloudflare.com/')) return;
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/uploads/')) return; // network only
  const isShell = e.request.mode === 'navigate' || (u.origin === self.location.origin && /(\/|\.html|\.js|\.css|\.webmanifest)$/.test(u.pathname));
  if (isShell) { // network-first: pick up code/UI updates as soon as the device is online, fall back to cache offline
    e.respondWith(fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; }).catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; }).catch(()=>caches.match('./index.html'))));
});
