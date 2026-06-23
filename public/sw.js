/* Service worker: cache app shell for offline use on the floor. */
const CACHE = 'golden-qa-v13';
const SHELL = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{mode:'no-cors'})))).then(()=>self.skipWaiting()).catch(()=>{})); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/uploads/')) return; // network only
  const isShell = e.request.mode === 'navigate' || (u.origin === self.location.origin && /(\/|\.html|\.js|\.css|\.webmanifest)$/.test(u.pathname));
  if (isShell) { // network-first: pick up code/UI updates as soon as the device is online, fall back to cache offline
    e.respondWith(fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; }).catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; }).catch(()=>caches.match('./index.html'))));
});
