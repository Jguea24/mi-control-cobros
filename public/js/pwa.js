// ============================================================
// PWA - SERVICE WORKER
// Mi Control de Cobros
// ============================================================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", async () => {

    try {

      const registration =
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/"
        });

      console.log(
        "[PWA] Service Worker registrado correctamente:",
        registration.scope
      );


      // ======================================================
      // DETECTAR ACTUALIZACIONES
      // ======================================================

      registration.addEventListener(
        "updatefound",
        () => {

          const newWorker =
            registration.installing;

          if (!newWorker) {
            return;
          }


          newWorker.addEventListener(
            "statechange",
            () => {

              console.log(
                "[PWA] Estado del Service Worker:",
                newWorker.state
              );


              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {

                console.log(
                  "[PWA] Nueva versión disponible."
                );

              }

            }
          );

        }
      );


      // ======================================================
      // COMPROBAR ACTUALIZACIONES
      // ======================================================

      await registration.update();

    } catch (error) {

      console.error(
        "[PWA] Error al registrar Service Worker:",
        error
      );

    }

  });


  // ==========================================================
  // CONTROLAR CAMBIO DE SERVICE WORKER
  // ==========================================================

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {

      console.log(
        "[PWA] Nuevo Service Worker activo."
      );

    }
  );

}