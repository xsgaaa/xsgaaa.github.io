var CACHE_NAME = 'xsgaaa-blog-tools-v1';
var CORE_ASSETS = [
  '/',
  '/tools/',
  '/css/mdui.min.css',
  '/css/main.css',
  '/css/iconfont.css',
  '/css/tools.css?v=3',
  '/js/mdui.min.js',
  '/js/meadow.js',
  '/js/tools-common.js?v=4',
  '/tools/js/hub.js',
  '/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
