// Radar Servizio: lets the page open without internet (e.g. under an indoor tennis bubble).
// The page itself: try the network first (so updates arrive as soon as you are online), fall back to the saved copy.
// Fonts: saved copy first.
const CACHE = "radar-servizio-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

// network with a time limit: a weak signal should not keep the page blank for long
function fetchWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(req).then(r => { clearTimeout(timer); resolve(r); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetchWithin(req, 3500)
        .then(res => saveCopy(req, res))
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => saveCopy(req, res))));
  }
});
