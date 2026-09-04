import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  auth,
  db
} from "./firebase-config.js";

const clientesCollection = collection(db, "clientes");

const clienteForm = document.querySelector("#clienteForm");
const saveClienteButton = document.querySelector("#saveClienteButton");
const clienteMessage = document.querySelector("#clienteMessage");

/**
 * Mostrar mensaje al usuario
 */
function showMessage(message, type = "error") {
  if (!clienteMessage) return;

  clienteMessage.textContent = message;

  clienteMessage.className =
    `form-message text-sm font-semibold rounded-xl px-4 py-3 ${
      type === "error"
        ? "bg-red-50 text-red-700"
        : "bg-green-50 text-green-700"
    }`;
}

/**
 * Obtener datos del formulario
 */
function getClienteFormData() {
  const formData = new FormData(clienteForm);

  return {
    nombre: String(formData.get("nombre") || "").trim(),
    telefono: String(formData.get("telefono") || "").trim(),
    correo: String(formData.get("correo") || "").trim(),
    direccion: String(formData.get("direccion") || "").trim(),
    notas: String(formData.get("notas") || "").trim()
  };
}

/**
 * Validar formulario
 */
function validateForm(data) {
  if (!data.nombre) {
    showMessage("El nombre del cliente es obligatorio.");
    return false;
  }

  if (!data.correo) {
    showMessage("El correo electrónico es obligatorio.");
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(data.correo)) {
    showMessage("El correo electrónico no es válido.");
    return false;
  }

  return true;
}

/**
 * Traducir errores de Firebase
 */
function getFirestoreErrorMessage(error) {
  const messages = {
    "permission-denied":
      "Firestore rechazó el guardado. Verifica que tengas permisos.",
    "unauthenticated":
      "Tu sesión no está activa. Vuelve a iniciar sesión.",
    "unavailable":
      "Firestore no está disponible en este momento. Intenta nuevamente."
  };

  console.error("Error de Firestore:", error);

  return (
    messages[error.code] ||
    `No se pudo guardar el cliente. Error: ${
      error.code || error.message
    }`
  );
}

/**
 * Guardar cliente
 */
if (clienteForm) {
  clienteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const clienteData = getClienteFormData();

    // Validar datos
    if (!validateForm(clienteData)) {
      return;
    }

    // Evitar doble envío
    if (saveClienteButton) {
      saveClienteButton.disabled = true;
      saveClienteButton.classList.add("opacity-70", "cursor-not-allowed");
    }

    try {
      await addDoc(clientesCollection, {
        ...clienteData,
        fechaRegistro: serverTimestamp(),
        activo: true
      });

      showMessage(
        "Cliente creado correctamente. Regresando al listado...",
        "success"
      );

      // Regresar a la página principal de clientes
      setTimeout(() => {
        window.location.href = "clientes.html";
      }, 1200);

    } catch (error) {
      showMessage(getFirestoreErrorMessage(error));

      if (saveClienteButton) {
        saveClienteButton.disabled = false;
        saveClienteButton.classList.remove(
          "opacity-70",
          "cursor-not-allowed"
        );
      }
    }
  });
}

/**
 * Verificar sesión
 */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});