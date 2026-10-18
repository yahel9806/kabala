'use strict';
/* Offline cache for this app only. Same-origin GET requests inside this app's scope; nothing else is touched.
   Network first (so updates arrive), cached copy as the offline fallback. */
var V='kabala-v1',PFX='kabala-';
var ASSETS=['./','index.html','app.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
var SCOPE=new URL(self.registration.scope);
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(ASSETS.map(function(u){return new Request(u,{cache:'reload'})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf(PFX)===0&&k!==V}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==SCOPE.origin||u.pathname.indexOf(SCOPE.pathname)!==0)return;
 var html=r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname),key=html?new URL('index.html',SCOPE).href:r;
 e.respondWith(fetch(r,{cache:'no-cache'}).then(function(res){if(res.ok&&res.type==='basic'){var c=res.clone();e.waitUntil(caches.open(V).then(function(x){return x.put(key,c)}))}return res})
  .catch(function(){return caches.match(key,{ignoreSearch:true}).then(function(m){return m||Response.error()})}))});
