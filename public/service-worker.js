const CACHE = "101-detailers-brand-v18";
const APP_SHELL = [
  "/",
  "/app.html",
  "/install-app.js",
  "/styles.css",
  "/reviews.html",
  "/manifest.webmanifest",
  "/assets/101-detailers-hero-poster.jpg",
  "/assets/101-detailers-shield-v2.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const injectHomeEnhancements = async (response) => {
  if (!response.ok) return response;
  let html = await response.text();

  const reviewsResponse = await fetch("/reviews.html", { cache: "no-store" });
  if (reviewsResponse.ok) {
    const reviews = await reviewsResponse.text();
    const pattern = /<section\s+class="reviews-shell section-tight"[\s\S]*?<\/section>/;
    if (pattern.test(html)) html = html.replace(pattern, reviews);
  }

  if (!html.includes('/install-app.js')) {
    html = html.replace(
      '</body>',
      '<script src="/install-app.js?v=18"></script>\n  </body>',
    );
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.has("range")) return;
  const url = new URL(event.request.url);
  const isHomeNavigation =
    event.request.mode === "navigate" &&
    url.origin === self.location.origin &&
    url.pathname === "/";
  const networkRequest =
    event.request.mode === "navigate"
      ? new Request(event.request, { cache: "no-store" })
      : event.request;
  event.respondWith(
    fetch(networkRequest)
      .then(async (response) => {
        const rendered = isHomeNavigation
          ? await injectHomeEnhancements(response)
          : response;
        const copy = rendered.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return rendered;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("/app.html") || caches.match("/")),
      ),
  );
});
