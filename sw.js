/* KILL-SWITCH — aposenta o PWA vanilla antigo.
   A raiz agora serve o app React (sem service worker). Este SW existe só para
   DESREGISTRAR o service worker antigo dos clientes que já o têm instalado e
   LIMPAR os caches, forçando o carregamento do app novo pela rede.
   Padrão consagrado de "como remover um service worker". */
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try { var cs = await self.clients.matchAll(); cs.forEach(function (c) { try { c.navigate(c.url); } catch (_) {} }); } catch (_) {}
  })());
});
/* Enquanto ainda ativo, não intercepta: deixa tudo ir para a rede. */
self.addEventListener('fetch', function () {});
