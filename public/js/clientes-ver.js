import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import { formatDate } from "./utils.js";

// ============================================================
// ELEMENTO PRINCIPAL
// ============================================================

const clienteDetalleContainer =
  document.querySelector("#clienteDetalles");

// ============================================================
// UTILIDADES
// ============================================================

function getClienteIdFromUrl() {
  const searchParams =
    new URLSearchParams(window.location.search);

  return searchParams.get("id");
}

function safeValue(value) {
  const text = String(value ?? "").trim();

  return text || "—";
}

function getActiveState(cliente) {
  return cliente.activo !== false;
}

function formatClientDate(value) {
  try {
    const formatted = formatDate(value);

    return formatted || "—";
  } catch (error) {
    console.warn(
      "No se pudo formatear la fecha:",
      error
    );

    return "—";
  }
}

// ============================================================
// OBTENER ELEMENTOS DINÁMICAMENTE
// ============================================================

function getElements() {
  return {
    clienteNombre:
      document.querySelector("#clienteNombre"),

    clienteEstado:
      document.querySelector("#clienteEstado"),

    editarClienteButton:
      document.querySelector("#editarClienteBtn"),

    detailResumenNombre:
      document.querySelector("#detail-resumen-nombre"),

    detailResumenEstado:
      document.querySelector("#detail-resumen-estado"),

    detailNombre:
      document.querySelector("#detail-nombre"),

    detailTelefono:
      document.querySelector("#detail-telefono"),

    detailCorreo:
      document.querySelector("#detail-correo"),

    detailDireccion:
      document.querySelector("#detail-direccion"),

    detailNotas:
      document.querySelector("#detail-notas"),

    detailFecha:
      document.querySelector("#detail-fecha"),

    detailStatusBadge:
      document.querySelector("#detail-status-badge")
  };
}

// ============================================================
// NOTIFICACIÓN
// ============================================================

function showNotification(
  message,
  type = "error"
) {
  const notification =
    document.createElement("div");

  notification.className =
    `fixed bottom-4 right-4 z-[100] max-w-sm rounded-2xl px-5 py-4 text-sm font-bold shadow-xl ${
      type === "error"
        ? "bg-red-600 text-white"
        : "bg-emerald-600 text-white"
    }`;

  notification.textContent =
    message;

  document.body.appendChild(
    notification
  );

  setTimeout(() => {
    notification.remove();
  }, 3500);
}

// ============================================================
// ESTADO DE CARGA
// ============================================================

function renderLoadingState() {
  const elements =
    getElements();

  if (elements.clienteNombre) {
    elements.clienteNombre.textContent =
      "Cargando...";
  }

  if (elements.clienteEstado) {
    elements.clienteEstado.textContent =
      "Consultando información...";
  }

  if (elements.detailResumenNombre) {
    elements.detailResumenNombre.textContent =
      "Cargando...";
  }

  if (elements.detailResumenEstado) {
    elements.detailResumenEstado.textContent =
      "Cargando";
  }

  if (elements.detailNombre) {
    elements.detailNombre.textContent =
      "Cargando...";
  }

  if (elements.detailTelefono) {
    elements.detailTelefono.textContent =
      "Cargando...";
  }

  if (elements.detailCorreo) {
    elements.detailCorreo.textContent =
      "Cargando...";
  }

  if (elements.detailDireccion) {
    elements.detailDireccion.textContent =
      "Cargando...";
  }

  if (elements.detailNotas) {
    elements.detailNotas.textContent =
      "Cargando...";
  }

  if (elements.detailFecha) {
    elements.detailFecha.textContent =
      "Cargando...";
  }

  if (elements.detailStatusBadge) {
    elements.detailStatusBadge.textContent =
      "Cargando";

    elements.detailStatusBadge.className =
      "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600";
  }
}

// ============================================================
// ESTADO DE ERROR
// ============================================================

function renderErrorState(message) {
  const elements =
    getElements();

  if (elements.clienteNombre) {
    elements.clienteNombre.textContent =
      "No disponible";
  }

  if (elements.clienteEstado) {
    elements.clienteEstado.textContent =
      "No fue posible cargar el cliente";

    elements.clienteEstado.className =
      "mt-1 text-sm font-semibold text-red-600";
  }

  if (elements.detailResumenNombre) {
    elements.detailResumenNombre.textContent =
      "Cliente no disponible";
  }

  if (elements.detailResumenEstado) {
    elements.detailResumenEstado.textContent =
      "Error";

    elements.detailResumenEstado.className =
      "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700";
  }

  if (elements.detailNombre) {
    elements.detailNombre.textContent =
      "—";
  }

  if (elements.detailTelefono) {
    elements.detailTelefono.textContent =
      "—";
  }

  if (elements.detailCorreo) {
    elements.detailCorreo.textContent =
      "—";
  }

  if (elements.detailDireccion) {
    elements.detailDireccion.textContent =
      "—";
  }

  if (elements.detailNotas) {
    elements.detailNotas.textContent =
      safeValue(message);
  }

  if (elements.detailFecha) {
    elements.detailFecha.textContent =
      "—";
  }

  if (elements.detailStatusBadge) {
    elements.detailStatusBadge.textContent =
      "Error";

    elements.detailStatusBadge.className =
      "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700";
  }

  if (elements.editarClienteButton) {
    elements.editarClienteButton.href =
      "clientes.html";

    elements.editarClienteButton.textContent =
      "Volver a clientes";
  }
}

// ============================================================
// CABECERA DEL CLIENTE
// ============================================================

function renderClienteHeader(cliente) {
  const elements =
    getElements();

  const activo =
    getActiveState(cliente);

  const nombre =
    safeValue(cliente.nombre);

  // Nombre principal
  if (elements.clienteNombre) {
    elements.clienteNombre.textContent =
      nombre;
  }

  // Estado debajo del nombre
  if (elements.clienteEstado) {
    elements.clienteEstado.textContent =
      activo
        ? "Cliente activo"
        : "Cliente inactivo";

    elements.clienteEstado.className =
      activo
        ? "mt-1 text-sm font-semibold text-emerald-600"
        : "mt-1 text-sm font-semibold text-slate-500";
  }

  // Nombre de resumen
  if (elements.detailResumenNombre) {
    elements.detailResumenNombre.textContent =
      nombre;
  }

  // Estado del resumen
  if (elements.detailResumenEstado) {
    elements.detailResumenEstado.textContent =
      activo
        ? "Activo"
        : "Inactivo";

    elements.detailResumenEstado.className =
      activo
        ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
        : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600";
  }

  // Badge de estado
  if (elements.detailStatusBadge) {
    elements.detailStatusBadge.textContent =
      activo
        ? "Activo"
        : "Inactivo";

    elements.detailStatusBadge.className =
      activo
        ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
        : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600";
  }
}

// ============================================================
// CAMPOS DEL CLIENTE
// ============================================================

function renderClienteFields(cliente) {
  const elements =
    getElements();

  if (elements.detailNombre) {
    elements.detailNombre.textContent =
      safeValue(cliente.nombre);
  }

  if (elements.detailTelefono) {
    elements.detailTelefono.textContent =
      safeValue(cliente.telefono);
  }

  if (elements.detailCorreo) {
    elements.detailCorreo.textContent =
      safeValue(cliente.correo);
  }

  if (elements.detailDireccion) {
    elements.detailDireccion.textContent =
      safeValue(cliente.direccion);
  }

  if (elements.detailNotas) {
    elements.detailNotas.textContent =
      safeValue(cliente.notas);
  }

  if (elements.detailFecha) {
    elements.detailFecha.textContent =
      formatClientDate(
        cliente.fechaRegistro
      );
  }
}

// ============================================================
// ACCIONES DE CONTACTO
// ============================================================

function renderContactActions(cliente) {
  const elements =
    getElements();

  const container =
    document.querySelector(
      "#clienteContactActions"
    );

  if (container) {
    container.remove();
  }

  const telefono =
    String(cliente.telefono || "").trim();

  const correo =
    String(cliente.correo || "").trim();

  if (!telefono && !correo) {
    return;
  }

  const actions =
    document.createElement("div");

  actions.id =
    "clienteContactActions";

  actions.className =
    "mt-6 grid gap-3 sm:grid-cols-2";

  // ----------------------------------------------------------
  // LLAMAR
  // ----------------------------------------------------------

  if (telefono) {
    const callLink =
      document.createElement("a");

    callLink.href =
      `tel:${telefono.replace(
        /\s+/g,
        ""
      )}`;

    callLink.className =
      "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700";

    callLink.textContent =
      "📞 Llamar al cliente";

    actions.appendChild(
      callLink
    );
  }

  // ----------------------------------------------------------
  // CORREO
  // ----------------------------------------------------------

  if (correo) {
    const mailLink =
      document.createElement("a");

    mailLink.href =
      `mailto:${correo}`;

    mailLink.className =
      "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700";

    mailLink.textContent =
      "✉️ Enviar correo";

    actions.appendChild(
      mailLink
    );
  }

  // Insertar debajo del contenido principal
  if (clienteDetalleContainer) {
    const contentSection =
      clienteDetalleContainer.querySelector(
        ".p-6.sm\\:p-8"
      );

    if (contentSection) {
      contentSection.appendChild(
        actions
      );
    } else {
      clienteDetalleContainer.appendChild(
        actions
      );
    }
  }
}

// ============================================================
// ENLACE DE EDICIÓN
// ============================================================

function renderEditButton(cliente) {
  const elements =
    getElements();

  if (
    elements.editarClienteButton &&
    cliente.id
  ) {
    elements.editarClienteButton.href =
      `clientes-editar.html?id=${encodeURIComponent(
        cliente.id
      )}`;

    elements.editarClienteButton.textContent =
      "Editar cliente";
  }
}

// ============================================================
// RENDERIZAR INFORMACIÓN COMPLETA
// ============================================================

function renderClienteDetalle(cliente) {
  renderClienteHeader(
    cliente
  );

  renderClienteFields(
    cliente
  );

  renderEditButton(
    cliente
  );

  renderContactActions(
    cliente
  );
}

// ============================================================
// CARGAR CLIENTE DESDE FIRESTORE
// ============================================================

async function loadCliente(clienteId) {
  if (!clienteId) {
    renderErrorState(
      "No se especificó el ID del cliente."
    );

    return;
  }

  renderLoadingState();

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
      renderErrorState(
        "El cliente seleccionado no existe en el sistema."
      );

      showNotification(
        "El cliente no existe.",
        "error"
      );

      return;
    }

    const cliente = {
      id:
        clienteDocSnap.id,

      ...clienteDocSnap.data()
    };

    renderClienteDetalle(
      cliente
    );

  } catch (error) {
    console.error(
      "Error al cargar cliente:",
      error
    );

    let message =
      "No se pudo cargar la información del cliente.";

    if (
      error?.code ===
      "permission-denied"
    ) {
      message =
        "Firestore rechazó la lectura. Verifica las reglas y los permisos del usuario.";
    }

    if (
      error?.code ===
      "unauthenticated"
    ) {
      message =
        "La sesión no está activa. Inicia sesión nuevamente.";
    }

    if (
      error?.code ===
      "not-found"
    ) {
      message =
        "El cliente solicitado ya no existe.";
    }

    renderErrorState(
      message
    );

    showNotification(
      message,
      "error"
    );
  }
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

    const clienteId =
      getClienteIdFromUrl();

    loadCliente(
      clienteId
    );
  }
);