// v0.2.21 — fichiers applicatifs prioritaires au réseau, secours hors connexion.
const CACHE='mon-ressenti-v0.2.21';
const FILES=['./','./index.html','./style.css','./app.js','./report.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'||/\.(?:js|css|html)$/.test(u.pathname)){
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
}else{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))}
});
