const CACHE_NAME =
  "spornrd-live-v3";


const APP_FILES = [

  "./",

  "./index.html",

  "./manifest.json",

  "./css/style.css",

  "./js/config.js",

  "./js/liveSources.js",

  "./js/app.js",

  "./assets/icons/icon.svg"

];



self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          cache =>
            cache.addAll(
              APP_FILES
            )
        )

    );


    self.skipWaiting();

  }
);



self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys =>

            Promise.all(

              keys
                .filter(
                  key =>
                    key !==
                    CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )

            )
        )

    );


    self.clients.claim();

  }
);



self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    const requestUrl =
      new URL(
        event.request.url
      );


    /*
      Harici API çağrısına müdahale etme.
      Her zaman gerçek ağdan gelsin.
    */

    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return;

    }


    event.respondWith(

      fetch(
        event.request
      )

        .then(
          response => {

            const copy =
              response.clone();


            caches
              .open(
                CACHE_NAME
              )
              .then(
                cache =>
                  cache.put(
                    event.request,
                    copy
                  )
              );


            return response;

          }
        )

        .catch(
          async () => {

            const cached =
              await caches.match(
                event.request
              );


            if (
              cached
            ) {

              return cached;

            }


            if (
              event.request.mode ===
              "navigate"
            ) {

              return caches.match(
                "./index.html"
              );

            }


            return new Response(
              "",
              {
                status:
                  503
              }
            );

          }
        )

    );

  }
);const CACHE_NAME = "spornrd-shell-v6";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/liveSources.js",
  "./js/learningEngine.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html")))
  );
});
