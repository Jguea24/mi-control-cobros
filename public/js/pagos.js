import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";

import {
  formatCurrency,
  formatDate,
  normalizeText,
  setText
} from "./utils.js";

// ============================================================
// COLECCIONES FIRESTORE
// ============================================================

const clientesCollection =
  collection(db, "clientes");

const deudasCollection =
  collection(db, "deudas");

const pagosCollection =
  collection(db, "pagos");

// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const totalRecaudado =
  document.querySelector("#totalRecaudado");

const recaudadoDetalle =
  document.querySelector("#recaudadoDetalle");

const totalPagos =
  document.querySelector("#totalPagos");

const clientesConPagos =
  document.querySelector("#clientesConPagos");

const pagosHoy =
  document.querySelector("#pagosHoy");

const pagosHoyDetalle =
  document.querySelector("#pagosHoyDetalle");

const pagosCount =
  document.querySelector("#pagosCount");

const buscarPago =
  document.querySelector("#buscarPago");

const metodoFiltro =
  document.querySelector("#metodoFiltro");

const pagosTableBody =
  document.querySelector("#pagosTableBody");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];
let pagos = [];

let clientesUnsubscribe = null;
let deudasUnsubscribe = null;
let pagosUnsubscribe = null;

let filtroTexto = "";
let filtroMetodo = "TODOS";

// ============================================================
// UTILIDADES
// ============================================================

function getClienteName(clienteId) {
  const cliente =
    clientes.find(
      (item) =>
        item.id === clienteId
    );

  return (
    cliente?.nombre ||
    "Cliente no encontrado"
  );
}

function getDeudaDescription(deudaId) {
  const deuda =
    deudas.find(
      (item) =>
        item.id === deudaId
    );

  return (
    deuda?.concepto ||
    "Deuda no encontrada"
  );
}

function getDateTimestamp(value) {
  if (!value) {
    return 0;
  }

  // Firestore Timestamp
  if (
    typeof value.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }

  // Timestamp con toDate
  if (
    typeof value.toDate ===
    "function"
  ) {
    return value
      .toDate()
      .getTime();
  }

  // Date
  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? 0
    : parsed.getTime();
}

function getPaymentDateKey(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value.slice(0, 10);
  }

  const date =
    typeof value.toDate ===
    "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function appendEmptyRow(
  message
) {
  if (!pagosTableBody) {
    return;
  }

  pagosTableBody.innerHTML =
    "";

  const row =
    document.createElement(
      "tr"
    );

  const cell =
    document.createElement(
      "td"
    );

  cell.colSpan = 6;

  cell.className =
    "px-6 py-14 text-center text-sm font-medium text-slate-400";

  cell.textContent =
    message;

  row.appendChild(
    cell
  );

  pagosTableBody.appendChild(
    row
  );
}

// ============================================================
// FILTRAR PAGOS
// ============================================================

function getFilteredPagos() {
  const search =
    normalizeText(
      filtroTexto
    );

  return [...pagos]
    .sort(
      (a, b) =>
        getDateTimestamp(
          b.fecha
        ) -
        getDateTimestamp(
          a.fecha
        )
    )
    .filter(
      (pago) => {
        const metodo =
          String(
            pago.metodoPago ||
            ""
          );

        // Filtro por método
        if (
          filtroMetodo !==
            "TODOS" &&
          metodo !==
            filtroMetodo
        ) {
          return false;
        }

        // Sin búsqueda
        if (!search) {
          return true;
        }

        const texto =
          normalizeText(
            [
              getClienteName(
                pago.clienteId
              ),
              getDeudaDescription(
                pago.deudaId
              ),
              pago.observacion,
              pago.metodoPago
            ].join(" ")
          );

        return texto.includes(
          search
        );
      }
    );
}

// ============================================================
// RESUMEN
// ============================================================

function renderResumen() {
  const total =
    pagos.reduce(
      (sum, pago) =>
        sum +
        Number(
          pago.monto || 0
        ),
      0
    );

  const clientesSet =
    new Set(
      pagos
        .map(
          (pago) =>
            pago.clienteId
        )
        .filter(Boolean)
    );

  const todayKey =
    getTodayKey();

  const pagosDelDia =
    pagos.filter(
      (pago) =>
        getPaymentDateKey(
          pago.fecha
        ) === todayKey
    );

  const totalHoy =
    pagosDelDia.reduce(
      (sum, pago) =>
        sum +
        Number(
          pago.monto || 0
        ),
      0
    );

  setText(
    totalRecaudado,
    formatCurrency(total)
  );

  setText(
    recaudadoDetalle,
    `${pagos.length} ${
      pagos.length === 1
        ? "pago registrado"
        : "pagos registrados"
    }`
  );

  setText(
    totalPagos,
    String(
      pagos.length
    )
  );

  setText(
    clientesConPagos,
    String(
      clientesSet.size
    )
  );

  setText(
    pagosHoy,
    formatCurrency(
      totalHoy
    )
  );

  setText(
    pagosHoyDetalle,
    `${pagosDelDia.length} ${
      pagosDelDia.length === 1
        ? "movimiento"
        : "movimientos"
    } hoy`
  );
}

// ============================================================
// TABLA
// ============================================================

function renderPagos() {
  const filteredPagos =
    getFilteredPagos();

  setText(
    pagosCount,
    `${filteredPagos.length} ${
      filteredPagos.length === 1
        ? "pago mostrado"
        : "pagos mostrados"
    }`
  );

  if (!pagosTableBody) {
    return;
  }

  pagosTableBody.innerHTML =
    "";

  if (
    filteredPagos.length ===
    0
  ) {
    appendEmptyRow(
      pagos.length === 0
        ? "Todavía no hay pagos registrados."
        : "No hay pagos que coincidan con los filtros."
    );

    return;
  }

  filteredPagos.forEach(
    (pago) => {
      const row =
        document.createElement(
          "tr"
        );

      row.className =
        "transition hover:bg-slate-50";

      const fecha =
        pago.fecha
          ? formatDate(
              `${pago.fecha}T00:00:00`
            )
          : "—";

      const values = [
        fecha,

        getClienteName(
          pago.clienteId
        ),

        getDeudaDescription(
          pago.deudaId
        ),

        formatCurrency(
          Number(
            pago.monto || 0
          )
        ),

        pago.metodoPago ||
          "—",

        pago.observacion ||
          "—"
      ];

      values.forEach(
        (
          value,
          index
        ) => {
          const cell =
            document.createElement(
              "td"
            );

          cell.className =
            index === 3
              ? "px-6 py-4 text-right text-sm font-bold text-slate-800"
              : "px-6 py-4 text-sm text-slate-700";

          if (
            index === 1
          ) {
            cell.className +=
              " font-bold text-slate-900";
          }

          cell.textContent =
            value;

          row.appendChild(
            cell
          );
        }
      );

      pagosTableBody.appendChild(
        row
      );
    }
  );
}

// ============================================================
// RENDER GENERAL
// ============================================================

function renderPagosModule() {
  renderResumen();
  renderPagos();
}

// ============================================================
// LISTENERS FIRESTORE
// ============================================================

function startListeners() {
  clientesUnsubscribe?.();
  deudasUnsubscribe?.();
  pagosUnsubscribe?.();

  // ----------------------------------------------------------
  // CLIENTES
  // ----------------------------------------------------------

  clientesUnsubscribe =
    onSnapshot(
      clientesCollection,

      (snapshot) => {
        clientes =
          snapshot.docs.map(
            (docSnapshot) => ({
              id:
                docSnapshot.id,

              ...docSnapshot.data()
            })
          );

        renderPagosModule();
      },

      (error) => {
        console.error(
          "Error al cargar clientes:",
          error
        );

        clientes = [];

        renderPagosModule();
      }
    );

  // ----------------------------------------------------------
  // DEUDAS
  // ----------------------------------------------------------

  deudasUnsubscribe =
    onSnapshot(
      deudasCollection,

      (snapshot) => {
        deudas =
          snapshot.docs.map(
            (docSnapshot) => ({
              id:
                docSnapshot.id,

              ...docSnapshot.data()
            })
          );

        renderPagosModule();
      },

      (error) => {
        console.error(
          "Error al cargar deudas:",
          error
        );

        deudas = [];

        renderPagosModule();
      }
    );

  // ----------------------------------------------------------
  // PAGOS
  // ----------------------------------------------------------

  pagosUnsubscribe =
    onSnapshot(
      pagosCollection,

      (snapshot) => {
        pagos =
          snapshot.docs.map(
            (docSnapshot) => ({
              id:
                docSnapshot.id,

              ...docSnapshot.data()
            })
          );

        renderPagosModule();
      },

      (error) => {
        console.error(
          "Error al cargar pagos:",
          error
        );

        pagos = [];

        appendEmptyRow(
          "No se pudieron cargar los pagos. Revisa tu sesión y las reglas de Firestore."
        );
      }
    );
}

// ============================================================
// BÚSQUEDA
// ============================================================

buscarPago?.addEventListener(
  "input",
  (event) => {
    filtroTexto =
      event.target.value ||
      "";

    renderPagos();
  }
);

// ============================================================
// FILTRO POR MÉTODO
// ============================================================

metodoFiltro?.addEventListener(
  "change",
  (event) => {
    filtroMetodo =
      event.target.value ||
      "TODOS";

    renderPagos();
  }
);

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
  auth,

  (user) => {
    if (!user) {
      clientesUnsubscribe?.();
      deudasUnsubscribe?.();
      pagosUnsubscribe?.();

      clientesUnsubscribe =
        null;

      deudasUnsubscribe =
        null;

      pagosUnsubscribe =
        null;

      return;
    }

    startListeners();
  }
);