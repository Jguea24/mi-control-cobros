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
  getDebtStatus,
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

// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const deudasTableBody =
  document.querySelector("#deudasTableBody");

const deudasCount =
  document.querySelector("#deudasCount");

const buscarDeuda =
  document.querySelector("#buscarDeuda");

const estadoFiltro =
  document.querySelector("#estadoFiltro");

const totalPorCobrar =
  document.querySelector("#totalPorCobrar");

const totalPendientes =
  document.querySelector("#totalPendientes");

const totalVencidas =
  document.querySelector("#totalVencidas");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];

let clientesUnsubscribe = null;
let deudasUnsubscribe = null;

let filtroTexto = "";
let filtroEstado = "TODOS";

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

function getDateValue(value) {
  if (!value) {
    return 0;
  }

  // Timestamp de Firestore
  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  // Firestore Timestamp convertido
  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  // Fecha normal
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

function sortDeudas(data) {
  return [...data].sort(
    (a, b) =>
      getDateValue(
        b.fechaRegistro
      ) -
      getDateValue(
        a.fechaRegistro
      )
  );
}

function getEstadoBadgeClass(
  estado
) {
  const classes = {
    PAGADO: "paid",
    PENDIENTE: "pending",
    VENCIDA: "overdue",
    ANULADA: "inactive"
  };

  return (
    classes[estado] ||
    "inactive"
  );
}

function appendEmptyRow(
  message
) {
  if (!deudasTableBody) {
    return;
  }

  deudasTableBody.innerHTML = "";

  const row =
    document.createElement(
      "tr"
    );

  const cell =
    document.createElement(
      "td"
    );

  cell.colSpan = 8;

  cell.className =
    "px-6 py-14 text-center text-sm font-medium text-slate-400";

  cell.textContent =
    message;

  row.appendChild(cell);

  deudasTableBody.appendChild(
    row
  );
}

// ============================================================
// RESUMEN
// ============================================================

function renderResumen() {
  const deudasConEstado =
    deudas.map(
      (deuda) => ({
        ...deuda,

        estadoActual:
          getDebtStatus(deuda)
      })
    );

  const porCobrar =
    deudasConEstado.reduce(
      (total, deuda) => {
        const saldo =
          Number(
            deuda.saldo || 0
          );

        return (
          total +
          (
            deuda.estadoActual ===
            "PAGADO"
              ? 0
              : Math.max(
                  saldo,
                  0
                )
          )
        );
      },
      0
    );

  const pendientes =
    deudasConEstado.filter(
      (deuda) =>
        deuda.estadoActual ===
        "PENDIENTE"
    ).length;

  const vencidas =
    deudasConEstado.filter(
      (deuda) =>
        deuda.estadoActual ===
        "VENCIDA"
    ).length;

  setText(
    totalPorCobrar,
    formatCurrency(
      porCobrar
    )
  );

  setText(
    totalPendientes,
    String(
      pendientes
    )
  );

  setText(
    totalVencidas,
    String(
      vencidas
    )
  );
}

// ============================================================
// FILTROS
// ============================================================

function getFilteredDeudas() {
  const search =
    normalizeText(
      filtroTexto
    );

  return sortDeudas(
    deudas
  ).filter(
    (deuda) => {
      const estado =
        getDebtStatus(
          deuda
        );

      // Filtro por estado
      if (
        filtroEstado !==
          "TODOS" &&
        estado !==
          filtroEstado
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
              deuda.clienteId
            ),

            deuda.concepto,

            deuda.notas
          ].join(" ")
        );

      return texto.includes(
        search
      );
    }
  );
}

// ============================================================
// RENDERIZAR TABLA
// ============================================================

function renderDeudas() {
  // Actualizar resumen
  renderResumen();

  const filteredDeudas =
    getFilteredDeudas();

  // Contador
  setText(
    deudasCount,
    `${filteredDeudas.length} ${
      filteredDeudas.length ===
      1
        ? "deuda mostrada"
        : "deudas mostradas"
    }`
  );

  if (!deudasTableBody) {
    return;
  }

  deudasTableBody.innerHTML =
    "";

  // Sin resultados
  if (
    filteredDeudas.length ===
    0
  ) {
    appendEmptyRow(
      deudas.length === 0
        ? "Todavía no hay deudas registradas."
        : "No hay deudas que coincidan con los filtros."
    );

    return;
  }

  // Renderizar filas
  filteredDeudas.forEach(
    (deuda) => {
      const estado =
        getDebtStatus(
          deuda
        );

      const row =
        document.createElement(
          "tr"
        );

      row.className =
        "transition hover:bg-slate-50";

      // Fecha de creación
      const fecha =
        deuda.fecha
          ? formatDate(
              `${deuda.fecha}T00:00:00`
            )
          : formatDate(
              deuda.fechaRegistro
            );

      // Fecha de vencimiento
      const vencimiento =
        deuda.fechaVencimiento
          ? formatDate(
              `${deuda.fechaVencimiento}T00:00:00`
            )
          : "—";

      // Datos principales
      const values = [
        getClienteName(
          deuda.clienteId
        ),

        deuda.concepto ||
          "—",

        fecha ||
          "—",

        vencimiento,

        formatCurrency(
          Number(
            deuda.monto ||
            0
          )
        ),

        formatCurrency(
          Number(
            deuda.montoPagado ||
            0
          )
        ),

        formatCurrency(
          Number(
            deuda.saldo ||
            0
          )
        )
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
            index >= 4
              ? "px-5 py-4 text-right text-sm font-medium text-slate-700"
              : "px-5 py-4 text-sm font-medium text-slate-700";

          // Nombre del cliente destacado
          if (
            index === 0
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

      // Celda del estado
      const estadoCell =
        document.createElement(
          "td"
        );

      estadoCell.className =
        "px-5 py-4 text-center";

      const badge =
        document.createElement(
          "span"
        );

      badge.className =
        `badge ${
          getEstadoBadgeClass(
            estado
          )
        }`;

      badge.textContent =
        estado;

      estadoCell.appendChild(
        badge
      );

      row.appendChild(
        estadoCell
      );

      deudasTableBody.appendChild(
        row
      );
    }
  );
}

// ============================================================
// FIRESTORE
// ============================================================

function startListeners() {
  // Limpiar listeners anteriores
  clientesUnsubscribe?.();
  deudasUnsubscribe?.();

  // ----------------------------------------------------------
  // CLIENTES
  // ----------------------------------------------------------

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

        // Se actualiza porque necesitamos
        // el nombre del cliente asociado
        // a cada deuda.
        renderDeudas();
      },

      (error) => {
        console.error(
          "Error al cargar clientes:",
          error
        );

        clientes = [];

        renderDeudas();
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
            (deudaDoc) => ({
              id:
                deudaDoc.id,

              ...deudaDoc.data()
            })
          );

        renderDeudas();
      },

      (error) => {
        console.error(
          "Error al cargar deudas:",
          error
        );

        deudas = [];

        setText(
          deudasCount,
          "Error al cargar deudas"
        );

        appendEmptyRow(
          "No se pudieron cargar las deudas. Revisa tu sesión y las reglas de Firestore."
        );
      }
    );
}

// ============================================================
// BÚSQUEDA
// ============================================================

buscarDeuda?.addEventListener(
  "input",
  (event) => {
    filtroTexto =
      event.target.value ||
      "";

    renderDeudas();
  }
);

// ============================================================
// FILTRO POR ESTADO
// ============================================================

estadoFiltro?.addEventListener(
  "change",
  (event) => {
    filtroEstado =
      event.target.value ||
      "TODOS";

    renderDeudas();
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

      clientesUnsubscribe =
        null;

      deudasUnsubscribe =
        null;

      return;
    }

    startListeners();
  }
);
