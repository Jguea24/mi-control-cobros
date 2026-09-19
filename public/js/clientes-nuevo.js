// ============================================================
// public/js/clientes-nuevo.js
// REGISTRO DE NUEVO CLIENTE
// Mi Control de Cobros
// ============================================================

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

// ============================================================
// FIRESTORE
// ============================================================

const clientesCollection = collection(db, "clientes");

// ============================================================
// DOM
// ============================================================

const clienteForm =
  document.getElementById("clienteForm");

const saveClienteButton =
  document.getElementById("saveClienteButton");

const clienteMessage =
  document.getElementById("clienteMessage");

// ============================================================
// ESTADO
// ============================================================

let usuarioActual = null;
let formularioListo = false;

// ============================================================
// MENSAJES
// ============================================================

function showMessage(message, type = "error") {
  if (!clienteMessage) {
    return;
  }

  clienteMessage.textContent = message;

  clienteMessage.className =
    `mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
      type === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700"
    }`;

  if (!message) {
    clienteMessage.classList.add("hidden");
  } else {
    clienteMessage.classList.remove("hidden");
  }
}

// ============================================================
// OBTENER DATOS DEL FORMULARIO
// ============================================================

function getFormData() {
  if (!clienteForm) {
    return null;
  }

  const formData = new FormData(clienteForm);

  return {
    nombres: String(
      formData.get("nombres") || ""
    ).trim(),

    apellidos: String(
      formData.get("apellidos") || ""
    ).trim(),

    telefono: String(
      formData.get("telefono") || ""
    ).trim(),

    correo: String(
      formData.get("correo") || ""
    ).trim(),

    direccion: String(
      formData.get("direccion") || ""
    ).trim(),

    notas: String(
      formData.get("notas") || ""
    ).trim()
  };
}

// ============================================================
// VALIDAR FORMULARIO
// ============================================================

function validateForm(data) {
  if (!data) {
    showMessage("No se pudo leer el formulario.");
    return false;
  }

  // ==========================================================
  // NOMBRES
  // ==========================================================

  if (!data.nombres) {
    showMessage(
      "Los nombres del cliente son obligatorios."
    );

    document
      .getElementById("nombres")
      ?.focus();

    return false;
  }

  if (data.nombres.length > 100) {
    showMessage(
      "Los nombres no pueden superar los 100 caracteres."
    );

    document
      .getElementById("nombres")
      ?.focus();

    return false;
  }

  // ==========================================================
  // APELLIDOS
  // ==========================================================

  if (!data.apellidos) {
    showMessage(
      "Los apellidos del cliente son obligatorios."
    );

    document
      .getElementById("apellidos")
      ?.focus();

    return false;
  }

  if (data.apellidos.length > 100) {
    showMessage(
      "Los apellidos no pueden superar los 100 caracteres."
    );

    document
      .getElementById("apellidos")
      ?.focus();

    return false;
  }

  // ==========================================================
  // TELÉFONO
  // ==========================================================

  if (data.telefono.length > 30) {
    showMessage(
      "El teléfono no puede superar los 30 caracteres."
    );

    document
      .getElementById("telefono")
      ?.focus();

    return false;
  }

  // ==========================================================
  // CORREO OPCIONAL
  // ==========================================================

  if (data.correo) {
    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(data.correo)) {
      showMessage(
        "El correo electrónico no es válido."
      );

      document
        .getElementById("correo")
        ?.focus();

      return false;
    }
  }

  if (data.correo.length > 120) {
    showMessage(
      "El correo no puede superar los 120 caracteres."
    );

    document
      .getElementById("correo")
      ?.focus();

    return false;
  }

  // ==========================================================
  // DIRECCIÓN
  // ==========================================================

  if (data.direccion.length > 200) {
    showMessage(
      "La dirección no puede superar los 200 caracteres."
    );

    document
      .getElementById("direccion")
      ?.focus();

    return false;
  }

  // ==========================================================
  // NOTAS
  // ==========================================================

  if (data.notas.length > 1000) {
    showMessage(
      "Las notas no pueden superar los 1000 caracteres."
    );

    document
      .getElementById("notas")
      ?.focus();

    return false;
  }

  return true;
}

// ============================================================
// ESTADO DEL BOTÓN
// ============================================================

function setSavingState(saving) {
  if (!saveClienteButton) {
    return;
  }

  if (saving) {
    saveClienteButton.disabled = true;

    saveClienteButton.classList.add(
      "cursor-not-allowed",
      "opacity-70"
    );

    if (!saveClienteButton.dataset.originalHtml) {
      saveClienteButton.dataset.originalHtml =
        saveClienteButton.innerHTML;
    }

    saveClienteButton.innerHTML = `
      <span
        class="inline-flex h-5 w-5 animate-spin rounded-full
               border-2 border-white/40 border-t-white">
      </span>
      Guardando...
    `;

    return;
  }

  saveClienteButton.disabled = false;

  saveClienteButton.classList.remove(
    "cursor-not-allowed",
    "opacity-70"
  );

  if (saveClienteButton.dataset.originalHtml) {
    saveClienteButton.innerHTML =
      saveClienteButton.dataset.originalHtml;

    delete saveClienteButton.dataset.originalHtml;
  }
}

// ============================================================
// ERROR FIRESTORE
// ============================================================

function getFirestoreErrorMessage(error) {
  console.error(
    "❌ Error al guardar cliente:",
    error
  );

  switch (error?.code) {
    case "permission-denied":
      return (
        "Firestore rechazó el registro. " +
        "Verifica que las reglas de Firestore estén actualizadas."
      );

    case "unauthenticated":
      return (
        "Tu sesión no está activa. Inicia sesión nuevamente."
      );

    case "unavailable":
      return (
        "Firestore no está disponible en este momento. Intenta nuevamente."
      );

    case "failed-precondition":
      return (
        "No se pudo completar la operación. Revisa la configuración de Firebase."
      );

    default:
      return (
        error?.message ||
        "No se pudo guardar el cliente. Intenta nuevamente."
      );
  }
}

// ============================================================
// REGISTRAR CLIENTE
// ============================================================

async function guardarCliente() {
  if (!usuarioActual) {
    showMessage(
      "Tu sesión no está activa. Inicia sesión nuevamente."
    );
    return;
  }

  const data = getFormData();

  if (!validateForm(data)) {
    return;
  }

  setSavingState(true);

  showMessage(
    "Guardando cliente...",
    "success"
  );

  try {
    // ========================================================
    // NOMBRE COMPLETO
    // Se mantiene para compatibilidad con los módulos
    // que actualmente utilizan cliente.nombre.
    // ========================================================

    const nombreCompleto =
      `${data.nombres} ${data.apellidos}`
        .replace(/\s+/g, " ")
        .trim();

    // ========================================================
    // DOCUMENTO FIRESTORE
    // ========================================================

    const cliente = {
      nombres: data.nombres,
      apellidos: data.apellidos,

      // Compatibilidad con módulos existentes
      nombre: nombreCompleto,

      telefono: data.telefono,
      correo: data.correo,
      direccion: data.direccion,
      notas: data.notas,

      fechaRegistro:
        serverTimestamp(),

      activo: true
    };

    // ========================================================
    // GUARDAR
    // ========================================================

    const nuevoClienteRef =
      await addDoc(
        clientesCollection,
        cliente
      );

    console.log(
      "✅ Cliente registrado correctamente:",
      nuevoClienteRef.id
    );

    showMessage(
      "Cliente registrado correctamente. Redirigiendo...",
      "success"
    );

    setTimeout(() => {
      window.location.href = "clientes.html";
    }, 1000);

  } catch (error) {
    showMessage(
      getFirestoreErrorMessage(error)
    );

    setSavingState(false);
  }
}

// ============================================================
// EVENTO DEL FORMULARIO
// ============================================================

if (clienteForm) {
  clienteForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!formularioListo) {
        showMessage(
          "Espera un momento mientras se valida tu sesión."
        );
        return;
      }

      await guardarCliente();
    }
  );
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
  auth,
  (user) => {
    usuarioActual = user;

    if (!user) {
      formularioListo = false;

      if (saveClienteButton) {
        saveClienteButton.disabled = true;
      }

      window.location.href =
        "login.html";

      return;
    }

    formularioListo = true;

    if (saveClienteButton) {
      saveClienteButton.disabled = false;
    }

    console.log(
      "✅ Usuario autenticado. Formulario de cliente listo."
    );
  }
);