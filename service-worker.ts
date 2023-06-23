/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="WebWorker" />

interface Window extends ServiceWorkerGlobalScope {}
const sw: ServiceWorkerGlobalScope = self as any;

sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open("blaze").then((cache) => {
      return cache.addAll(["/"]);
    })
  );
});

// TODO: I had to use any, the solutions above (references) were ineffective
// (but un the install works).
// must be fixed.
self.addEventListener("fetch", (event: any) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const currentEtag = networkResponse.headers.get("X-Blaze-Etag");
          return caches.open("blaze").then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
              const cachedEtag = cachedResponse
                ? cachedResponse.headers.get("X-Blaze-Etag")
                : null;
              if (currentEtag === cachedEtag) {
                return cachedResponse;
              } else {
                return cache
                  .put(event.request, networkResponse.clone())
                  .then(() => {
                    return networkResponse;
                  });
              }
            });
          });
        } else {
          return networkResponse;
        }
      })
      .catch(() => {
        return caches.open("blaze").then((cache) => {
          return cache
            .match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              } else {
                return new Response("You are offline");
              }
            })
            .catch(() => {
              return new Response("An error occurred");
            });
        });
      })
  );
});
