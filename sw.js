/* Ateliê Manager — Service Worker (PWA)
   Padrão §14.2 dos Padrões VIZIO/INPERSON (ref.: sw.js do Inovar Formaturas).

   Estratégia:
   - HTML (navegação): NETWORK-FIRST com cache:'no-store'. Abrir o app sempre puxa a
     build mais nova; o cache do HTML só é usado como fallback quando está offline.
   - Estáticos da própria origem (logo, svg): stale-while-revalidate.
   - Supabase / CDNs / fontes (cross-origin): NÃO intercepta — passa direto ao navegador.
   - URLs com `?_v=` (checagem do VersionGate): NÃO intercepta — senão o cache cresceria
     uma entrada a cada 10 min, para sempre, e o VersionGate deixaria de ver a rede real.
   - install: skipWaiting() → activate: clients.claim(). SW novo assume na hora.

   ⚠️ Ao publicar uma versão nova do produto, bumpar CACHE abaixo (ex.: atelie-v1.24.0)
   junto com window.APP_VERSION no index.html. O byte-diff faz o navegador trocar o SW. */

var CACHE = 'atelie-v1.23.0';
var CORE = ['./', './index.html'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function(e){
  if(e.data === 'PULAR_ESPERA') self.skipWaiting();
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url;
  try{ url = new URL(req.url); }catch(_){ return; }

  // Só mexe no próprio site. Supabase/CDN/fontes seguem direto (offline não os terá em cache,
  // mas o objetivo aqui é "online sempre novo" + fallback do shell HTML, não offline total).
  if(url.origin !== self.location.origin) return;

  // Nunca cachear a checagem de versão do VersionGate.
  if(url.search.indexOf('_v=') !== -1) return;

  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if(isHTML){
    e.respondWith((async function(){
      try{
        var fresh = await fetch(req, { cache: 'no-store' });
        var c = await caches.open(CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      }catch(_){
        var cached = (await caches.match('./index.html')) || (await caches.match(req)) || (await caches.match('./'));
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Estáticos da própria origem: stale-while-revalidate.
  e.respondWith((async function(){
    var c = await caches.open(CACHE);
    var cached = await c.match(req);
    var net = fetch(req).then(function(r){
      if(r && r.ok && (r.type === 'basic' || r.type === 'default')) c.put(req, r.clone());
      return r;
    }).catch(function(){ return null; });
    return cached || (await net) || new Response('', { status: 504 });
  })());
});
