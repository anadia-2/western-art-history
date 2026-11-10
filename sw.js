/* 서양미술 전시실 앱 · 오프라인용 서비스 워커
   app.html과 같은 폴더에 sw.js 이름으로 올려 주세요. */
const SHELL = "wa-shell-v1";   // 앱 파일
const IMGS  = "wa-img-v1";     // 작품 이미지 (위키미디어)
const FONTS = "wa-font-v1";    // 구글 글꼴
const META  = "wa-meta-v1";    // 이미지 주소 목록 (앱이 직접 씀)
const KEEP = [SHELL, IMGS, FONTS, META];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.add(new Request("app.html", { cache: "reload" }))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) 페이지: 인터넷이 되면 최신 파일, 안 되면 저장해 둔 파일
  if (req.mode === "navigate" && url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(url.pathname, res.clone());
        return res;
      } catch (err) {
        return (await cache.match(url.pathname)) ||
               (await cache.match("app.html")) ||
               Response.error();
      }
    })());
    return;
  }

  // 2) 작품 이미지: 저장된 것이 있으면 바로, 없으면 받아서 저장
  if (url.hostname === "upload.wikimedia.org") {
    e.respondWith((async () => {
      const cache = await caches.open(IMGS);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      try {
        const res = await fetch(new Request(req.url, { mode: "cors", credentials: "omit" }));
        if (res.ok) cache.put(req.url, res.clone());
        return res;
      } catch (err) {
        return Response.error();
      }
    })());
    return;
  }

  // 3) 글꼴: 한 번 받으면 저장해 두고 계속 사용
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") cache.put(req, res.clone());
        return res;
      } catch (err) {
        return Response.error();
      }
    })());
  }
});
