import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";

// ============================================================
// ELEMENTOS DEL FORMULARIO
// ============================================================

const clienteForm = document.querySelector("#clienteForm");
const saveClienteButton = document.querySelector("#saveClienteButton");
const clienteMessage = document.querySelector("#clienteMessage");
const clienteIdInput = document.querySelector("#clienteId");

let clienteIdActual = null;

// ============================================================
// MOSTRAR MENSAJE
// ============================================================

function showMessage(message, type = "error") {
  if (!clienteMessage) return;

  clienteMessage.textContent = message;

  clienteMessage.className =
    `form-message text-sm font-semibold rounded-xl px-4 py-3 ${
      type === "error"
        ? "bg-red-50 text-red-700"
        : "bg-green-50 text-green-700"
    }`;

  if (!message) {
    clienteMessage.classList.add("hidden");
  } else {
    clienteMessage.classList.remove("hidden");
  }
}

// ============================================================
// OBTENER ID DEL CLIENTE DESDE LA URL
// ============================================================

function getClienteIdFromUrl() {
  const searchParams =
    new URLSearchParams(window.location.search);

  return searchParams.get("id");
}

// ============================================================
// OBTENER DATOS DEL FORMULARIO
// ============================================================

function getClienteFormData() {
  const formData =
    new FormData(clienteForm);

  return {
    nombre:
      String(
        formData.get("nombre") || ""
      ).trim(),

    telefono:
      String(
        formData.get("telefono") || ""
      ).trim(),

    correo:
      String(
        formData.get("correo") || ""
      ).trim(),

    direccion:
      String(
        formData.get("direccion") || ""
      ).trim(),

    notas:
      String(
        formData.get("notas") || ""
      ).trim()
  };
}

// ============================================================
// VALIDAR FORMULARIO
// ============================================================

function validateForm(data) {

  if (!data.nombre) {
    showMessage(
      "El nombre del cliente es obligatorio."
    );

    return false;
  }

  if (!data.correo) {
    showMessage(
      "El correo electrónico es obligatorio."
    );

    return false;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(data.correo)) {

    showMessage(
      "El correo electrónico no es válido."
    );

    return false;
  }

  return true;
}

// ============================================================
// MENSAJES DE ERROR FIRESTORE
// ============================================================

function getFirestoreErrorMessage(error) {

  const messages = {

    "permission-denied":
      "Firestore rechazó la actualización. Verifica que tengas permisos para modificar clientes.",

    "unauthenticated":
      "Tu sesión no está activa. Vuelve a iniciar sesión.",

    "unavailable":
      "Firestore no está disponible en este momento. Intenta nuevamente.",

    "not-found":
      "El cliente seleccionado ya no existe."
  };

  console.error(
    "Error de Firestore:",
    error
  );

  return (
    messages[error?.code] ||
    `No se pudo actualizar el cliente. Error: ${
      error?.code ||
      error?.message ||
      "desconocido"
    }`
  );
}

// ============================================================
// ESTADO DE CARGA DEL FORMULARIO
// ============================================================

function setLoadingState(isLoading) {

  if (!clienteForm) {
    return;
  }

  const controls =
    clienteForm.querySelectorAll(
      "input, textarea, button"
    );

  controls.forEach((control) => {

    if (control.id === "clienteId") {
      return;
    }

    control.disabled =
      isLoading;
  });

  if (!saveClienteButton) {
    return;
  }

  if (isLoading) {

    saveClienteButton.disabled =
      true;

    saveClienteButton.classList.add(
      "cursor-not-allowed",
      "opacity-70"
    );

    saveClienteButton.dataset.originalHtml =
      saveClienteButton.innerHTML;

    saveClienteButton.innerHTML = `
      <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
      Cargando...
    `;

  } else {

    saveClienteButton.disabled =
      false;

    saveClienteButton.classList.remove(
      "cursor-not-allowed",
      "opacity-70"
    );

    const originalHtml =
      saveClienteButton.dataset.originalHtml;

    if (originalHtml) {

      saveClienteButton.innerHTML =
        originalHtml;

      delete saveClienteButton.dataset.originalHtml;
    }
  }
}

// ============================================================
// CARGAR DATOS DEL CLIENTE
// ============================================================

async function loadClienteData(clienteId) {

  if (!clienteId) {

    showMessage(
      "No se especificó el ID del cliente."
    );

    if (saveClienteButton) {
      saveClienteButton.disabled =
        true;
    }

    return;
  }

  setLoadingState(true);

  showMessage("");

  try {

    const clienteDocRef =
      doc(
        db,
        "clientes",
        clienteId
      );

    const clienteDocSnap =
      await getDoc(
        clienteDocRef
      );

    if (!clienteDocSnap.exists()) {

      showMessage(
        "El cliente seleccionado no existe."
      );

      if (saveClienteButton) {
        saveClienteButton.disabled =
          true;
      }

      return;
    }

    const cliente =
      clienteDocSnap.data();

    // ========================================================
    // CARGAR LOS DATOS DIRECTAMENTE EN LOS CAMPOS EXISTENTES
    // ========================================================
    //
    // IMPORTANTE:
    // No usamos clienteForm.innerHTML.
    // Esto mantiene visible el botón Guardar cambios.
    //

    const nombreInput =
      clienteForm.querySelector(
        'input[name="nombre"]'
      );

    const telefonoInput =
      clienteForm.querySelector(
        'input[name="telefono"]'
      );

    const correoInput =
      clienteForm.querySelector(
        'input[name="correo"]'
      );

    const direccionInput =
      clienteForm.querySelector(
        'input[name="direccion"]'
      );

    const notasInput =
      clienteForm.querySelector(
        'textarea[name="notas"]'
      );

    if (nombreInput) {
      nombreInput.value =
        cliente.nombre || "";
    }

    if (telefonoInput) {
      telefonoInput.value =
        cliente.telefono || "";
    }

    if (correoInput) {
      correoInput.value =
        cliente.correo || "";
    }

    if (direccionInput) {
      direccionInput.value =
        cliente.direccion || "";
    }

    if (notasInput) {
      notasInput.value =
        cliente.notas || "";
    }

    clienteIdActual =
      clienteId;

    if (clienteIdInput) {
      clienteIdInput.value =
        clienteId;
    }

    console.log(
      "Cliente cargado correctamente:",
      clienteId
    );

  } catch (error) {

    console.error(
      "Error al cargar cliente:",
      error
    );

    let message =
      "No se pudo cargar el cliente. Intenta nuevamente.";

    if (error?.code === "permission-denied") {

      message =
        "Firestore rechazó la lectura. Verifica tus permisos.";
    }

    if (error?.code === "unauthenticated") {

      message =
        "La sesión no está activa. Inicia sesión nuevamente.";
    }

    showMessage(message);

    if (saveClienteButton) {

      saveClienteButton.disabled =
        true;
    }

  } finally {

    setLoadingState(false);
  }
}

// ============================================================
// GUARDAR CAMBIOS
// ============================================================

if (clienteForm) {

  clienteForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (!clienteIdActual) {

        showMessage(
          "No se especificó el ID del cliente."
        );

        return;
      }

      const clienteData =
        getClienteFormData();

      // Validar
      if (!validateForm(clienteData)) {
        return;
      }

      // Desactivar botón
      if (saveClienteButton) {

        saveClienteButton.disabled =
          true;

        saveClienteButton.classList.add(
          "cursor-not-allowed",
          "opacity-70"
        );

        saveClienteButton.dataset.originalHtml =
          saveClienteButton.innerHTML;

        saveClienteButton.innerHTML = `
          <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
          Guardando...
        `;
      }

      try {

        const clienteDocRef =
          doc(
            db,
            "clientes",
            clienteIdActual
          );

        // Actualizar Firestore
        await updateDoc(
          clienteDocRef,
          clienteData
        );

        showMessage(
          "Cliente actualizado correctamente. Regresando al listado...",
          "success"
        );

        console.log(
          "Cliente actualizado:",
          clienteIdActual
        );

        // Regresar al listado
        setTimeout(() => {

          window.location.href =
            "clientes.html";

        }, 1200);

      } catch (error) {

        showMessage(
          getFirestoreErrorMessage(error)
        );

        // Restaurar botón
        if (saveClienteButton) {

          const originalHtml =
            saveClienteButton.dataset.originalHtml;

          if (originalHtml) {

            saveClienteButton.innerHTML =
              originalHtml;

            delete saveClienteButton.dataset.originalHtml;
          }

          saveClienteButton.disabled =
            false;

          saveClienteButton.classList.remove(
            "cursor-not-allowed",
            "opacity-70"
          );
        }
      }
    }
  );
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    console.log(
      "Usuario autenticado:",
      user.email || user.uid
    );

    const clienteId =
      getClienteIdFromUrl();

    loadClienteData(
      clienteId
    );
  }
);