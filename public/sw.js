// ============================================================
// SERVICE WORKER - MI CONTROL DE COBROS
// Firebase Hosting + PWA
// ============================================================

const CACHE_NAME = "mi-control-cobros-v2";


// ============================================================
// ARCHIVOS ESTÁTICOS QUE SÍ SE PUEDEN GUARDAR EN CACHÉ
// ============================================================

const APP_SHELL = [
  "/offline.html",

  "/css/styles.css",
  "/css/login.css",
  "/css/dashboard.css",
  "/css/responsive.css",

  "/js/pwa.js",
  "/js/utils.js",

  "/manifest.webmanifest",

  "/assets/icons/icon.svg"
];


// ============================================================
// INSTALACIÓN
// ============================================================

self.addEventListener("install", (event) => {

  console.log("[SW] Instalando:", CACHE_NAME);

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then((cache) => {

        return cache.addAll(APP_SHELL);

      })
      .catch((error) => {

        console.error(
          "[SW] Error al crear caché:",
          error
        );

      })

  );

  // Activar inmediatamente la nueva versión
  self.skipWaiting();

});


// ============================================================
// ACTIVACIÓN
// ============================================================

self.addEventListener("activate", (event) => {

  console.log("[SW] Activando:", CACHE_NAME);

  event.waitUntil(

    caches.keys()
      .then((cacheNames) => {

        return Promise.all(

          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== CACHE_NAME
            )
            .map((cacheName) => {

              console.log(
                "[SW] Eliminando caché antigua:",
                cacheName
              );

              return caches.delete(cacheName);

            })

        );

      })
      .then(() => {

        return self.clients.claim();

      })

  );

});


// ============================================================
// FETCH
// ============================================================

self.addEventListener("fetch", (event) => {

  const request = event.request;

  // Solo solicitudes GET
  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);


  // ==========================================================
  // NO INTERCEPTAR SERVICIOS DE FIREBASE / GOOGLE
  // ==========================================================

  const isFirebaseRequest =
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("google.com");


  if (isFirebaseRequest) {

    return;

  }


  // ==========================================================
  // PÁGINAS HTML
  // ==========================================================

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)
        .then((response) => {

          /*
           * IMPORTANTE:
           *
           * NO guardamos HTML en caché.
           *
           * De esta forma Firebase siempre entrega
           * la versión actual de:
           *
           * /login
           * /login.html
           * /index.html
           * /clientes.html
           * /deudas.html
           * /pagos.html
           * /historial.html
           */

          return response;

        })
        .catch(() => {

          /*
           * Si no existe conexión,
           * mostrar la página offline.
           */

          return caches.match(
            "/offline.html"
          );

        })

    );

    return;

  }


  // ==========================================================
  // ARCHIVOS ESTÁTICOS
  // ==========================================================

  event.respondWith(

    caches.match(request)
      .then((cachedResponse) => {

        // Si existe en caché, utilizarlo
        if (cachedResponse) {

          return cachedResponse;

        }


        // Si no existe, solicitarlo al servidor
        return fetch(request)
          .then((response) => {

            /*
             * Solo guardar respuestas válidas.
             */

            if (
              !response ||
              response.status !== 200 ||
              response.type === "opaque"
            ) {

              return response;

            }


            /*
             * Crear una copia para el caché.
             */

            const responseClone =
              response.clone();


            caches.open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  responseClone
                );

              });


            return response;

          });

      })

  );

});