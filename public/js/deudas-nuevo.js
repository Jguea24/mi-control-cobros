import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  auth,
  db
} from "./firebase-config.js";

import {
  getTodayInputValue
} from "./utils.js";

// ============================================================
// COLECCIONES FIRESTORE
// ============================================================

const clientesCollection =
  collection(db, "clientes");

const deudasCollection =
  collection(db, "deudas");

// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const deudaForm =
  document.querySelector(
    "#deudaForm"
  );

const clienteSelect =
  document.querySelector(
    "#clienteId"
  );

const saveDeudaButton =
  document.querySelector(
    "#saveDeudaButton"
  );

const deudaMessage =
  document.querySelector(
    "#deudaMessage"
  );

// ============================================================
// ESTADO
// ============================================================

let clientes = [];

let clientesUnsubscribe =
  null;

// ============================================================
// FECHA INICIAL
// ============================================================

if (
  deudaForm?.fecha
) {
  deudaForm.fecha.value =
    getTodayInputValue();
}

// ============================================================
// MENSAJES
// ============================================================

function showMessage(
  message,
  type = "error"
) {
  if (!deudaMessage) {
    return;
  }

  deudaMessage.textContent =
    message;

  if (!message) {
    deudaMessage.className =
      "mt-3 min-h-5 rounded-xl px-4 py-3 text-sm font-semibold";

    return;
  }

  deudaMessage.className =
    `mt-3 min-h-5 rounded-xl px-4 py-3 text-sm font-semibold ${
      type === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700"
    }`;
}

// ============================================================
// ERRORES FIRESTORE
// ============================================================

function getFirestoreErrorMessage(
  error
) {
  console.error(
    "Error de Firestore:",
    error
  );

  const messages = {
    "permission-denied":
      "Firestore rechazó la operación. Verifica tus permisos.",
    
    unauthenticated:
      "Tu sesión no está activa. Vuelve a iniciar sesión.",

    unavailable:
      "Firestore no está disponible en este momento. Intenta nuevamente.",

    "failed-precondition":
      "Firestore requiere una configuración adicional para completar esta operación."
  };

  return (
    messages[
      error?.code
    ] ||
    `No se pudo guardar la deuda. ${
      error?.message ||
      "Error desconocido."
    }`
  );
}

// ============================================================
// CARGAR CLIENTES ACTIVOS
// ============================================================

function renderClientesSelect() {
  if (!clienteSelect) {
    return;
  }

  clienteSelect.innerHTML =
    "";

  const activeClientes =
    clientes.filter(
      (cliente) =>
        cliente.activo !==
        false
    );

  // Opción inicial
  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value =
    "";

  placeholder.textContent =
    activeClientes.length >
    0
      ? "Selecciona un cliente"
      : "No hay clientes activos";

  clienteSelect.appendChild(
    placeholder
  );

  // Clientes activos
  activeClientes.forEach(
    (cliente) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        cliente.id;

      option.textContent =
        cliente.nombre ||
        "Cliente sin nombre";

      clienteSelect.appendChild(
        option
      );
    }
  );

  clienteSelect.disabled =
    activeClientes.length ===
    0;

  if (saveDeudaButton) {
    saveDeudaButton.disabled =
      activeClientes.length ===
      0;
  }
}

// ============================================================
// OBTENER DATOS DEL FORMULARIO
// ============================================================

function getDeudaFormData() {
  const formData =
    new FormData(
      deudaForm
    );

  return {
    clienteId:
      String(
        formData.get(
          "clienteId"
        ) || ""
      ).trim(),

    concepto:
      String(
        formData.get(
          "concepto"
        ) || ""
      ).trim(),

    monto:
      Number(
        formData.get(
          "monto"
        )
      ),

    fecha:
      String(
        formData.get(
          "fecha"
        ) || ""
      ).trim(),

    fechaVencimiento:
      String(
        formData.get(
          "fechaVencimiento"
        ) || ""
      ).trim(),

    notas:
      String(
        formData.get(
          "notas"
        ) || ""
      ).trim()
  };
}

// ============================================================
// VALIDACIÓN
// ============================================================

function validateDeuda(
  data
) {
  if (!data.clienteId) {
    return (
      "Selecciona un cliente."
    );
  }

  if (!data.concepto) {
    return (
      "El concepto es obligatorio."
    );
  }

  if (
    !Number.isFinite(
      data.monto
    ) ||
    data.monto <= 0
  ) {
    return (
      "Ingresa un monto mayor a cero."
    );
  }

  if (!data.fecha) {
    return (
      "Selecciona la fecha de la deuda."
    );
  }

  if (
    !data.fechaVencimiento
  ) {
    return (
      "Selecciona la fecha de vencimiento."
    );
  }

  const fechaDeuda =
    new Date(
      `${data.fecha}T00:00:00`
    );

  const fechaVencimiento =
    new Date(
      `${data.fechaVencimiento}T00:00:00`
    );

  if (
    Number.isNaN(
      fechaDeuda.getTime()
    ) ||
    Number.isNaN(
      fechaVencimiento.getTime()
    )
  ) {
    return (
      "Las fechas seleccionadas no son válidas."
    );
  }

  if (
    fechaVencimiento <
    fechaDeuda
  ) {
    return (
      "La fecha de vencimiento no puede ser anterior a la fecha de la deuda."
    );
  }

  return "";
}

// ============================================================
// ESTADO DEL BOTÓN
// ============================================================

function setSavingState(
  saving
) {
  if (!saveDeudaButton) {
    return;
  }

  if (saving) {
    if (
      !saveDeudaButton.dataset
        .originalHtml
    ) {
      saveDeudaButton.dataset.originalHtml =
        saveDeudaButton.innerHTML;
    }

    saveDeudaButton.disabled =
      true;

    saveDeudaButton.classList.add(
      "cursor-not-allowed",
      "opacity-70"
    );

    saveDeudaButton.innerHTML = `
      <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
      Guardando...
    `;

    return;
  }

  saveDeudaButton.disabled =
    false;

  saveDeudaButton.classList.remove(
    "cursor-not-allowed",
    "opacity-70"
  );

  if (
    saveDeudaButton.dataset
      .originalHtml
  ) {
    saveDeudaButton.innerHTML =
      saveDeudaButton.dataset
        .originalHtml;

    delete saveDeudaButton
      .dataset
      .originalHtml;
  }
}

// ============================================================
// ENVIAR FORMULARIO
// ============================================================

deudaForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const data =
      getDeudaFormData();

    const validationMessage =
      validateDeuda(
        data
      );

    if (validationMessage) {
      showMessage(
        validationMessage
      );

      return;
    }

    setSavingState(
      true
    );

    showMessage(
      "Guardando deuda...",
      "success"
    );

    try {
      await addDoc(
        deudasCollection,
        {
          clienteId:
            data.clienteId,

          concepto:
            data.concepto,

          monto:
            data.monto,

          montoPagado:
            0,

          saldo:
            data.monto,

          fecha:
            data.fecha,

          fechaRegistro:
            serverTimestamp(),

          fechaVencimiento:
            data.fechaVencimiento,

          estado:
            "PENDIENTE",

          notas:
            data.notas
        }
      );

      showMessage(
        "Deuda creada correctamente. Regresando al listado...",
        "success"
      );

      setTimeout(
        () => {
          window.location.href =
            "deudas.html";
        },
        900
      );

    } catch (error) {
      showMessage(
        getFirestoreErrorMessage(
          error
        )
      );

      setSavingState(
        false
      );
    }
  }
);

// ============================================================
// LISTENER DE CLIENTES
// ============================================================

function startClientesListener() {
  clientesUnsubscribe?.();

  clientesUnsubscribe =
    onSnapshot(
      clientesCollection,

      (snapshot) => {
        clientes =
          snapshot.docs.map(
            (clienteDoc) => ({
              id:
                clienteDoc.id,

              ...clienteDoc.data()
            })
          );

        renderClientesSelect();
      },

      (error) => {
        console.error(
          "Error al cargar clientes:",
          error
        );

        clientes = [];

        if (clienteSelect) {
          clienteSelect.innerHTML =
            `
              <option value="">
                No se pudieron cargar clientes
              </option>
            `;

          clienteSelect.disabled =
            true;
        }

        if (saveDeudaButton) {
          saveDeudaButton.disabled =
            true;
        }

        showMessage(
          "No se pudieron cargar los clientes. Verifica tu sesión y los permisos de Firestore."
        );
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
      clientesUnsubscribe?.();

      clientesUnsubscribe =
        null;

      return;
    }

    startClientesListener();
  }
);