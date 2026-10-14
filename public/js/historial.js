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

const clienteFiltro =
  document.querySelector("#clienteFiltro");

const fechaInicial =
  document.querySelector("#fechaInicial");

const fechaFinal =
  document.querySelector("#fechaFinal");

const estadoFiltro =
  document.querySelector("#estadoFiltro");

const limpiarFiltrosButton =
  document.querySelector("#limpiarFiltrosButton");

// Indicadores
const historialTotalCobrado =
  document.querySelector("#historialTotalCobrado");

const historialNumeroPagos =
  document.querySelector("#historialNumeroPagos");

const historialClientes =
  document.querySelector("#historialClientes");

const historialPromedio =
  document.querySelector("#historialPromedio");

// Tabla
const historialCount =
  document.querySelector("#historialCount");

const historialTableBody =
  document.querySelector("#historialTableBody");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];
let pagos = [];

let clientesUnsubscribe =
  null;

let deudasUnsubscribe =
  null;

let pagosUnsubscribe =
  null;

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

function getDeuda(
  deudaId
) {
  return (
    deudas.find(
      (deuda) =>
        deuda.id === deudaId
    ) || null
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

function getDateTimestamp(
  value
) {
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

  // Firestore Timestamp con toDate()
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

  // String o número
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

// ============================================================
// ESTADO VACÍO
// ============================================================

function appendEmptyRow(
  message
) {
  if (
    !historialTableBody
  ) {
    return;
  }

  historialTableBody.innerHTML =
    "";

  const row =
    document.createElement(
      "tr"
    );

  const cell =
    document.createElement(
      "td"
    );

  cell.colSpan = 7;

  cell.className =
    "px-6 py-14 text-center text-sm font-medium text-slate-400";

  cell.textContent =
    message;

  row.appendChild(
    cell
  );

  historialTableBody.appendChild(
    row
  );
}

// ============================================================
// SELECT DE CLIENTES
// ============================================================

function renderClienteFiltro() {
  if (!clienteFiltro) {
    return;
  }

  const selectedValue =
    clienteFiltro.value ||
    "TODOS";

  clienteFiltro.innerHTML =
    "";

  // Todos
  const allOption =
    document.createElement(
      "option"
    );

  allOption.value =
    "TODOS";

  allOption.textContent =
    "Todos los clientes";

  clienteFiltro.appendChild(
    allOption
  );

  // Ordenar clientes alfabéticamente
  const sortedClientes =
    [...clientes].sort(
      (a, b) =>
        String(
          a.nombre || ""
        ).localeCompare(
          String(
            b.nombre || ""
          ),
          "es",
          {
            sensitivity:
              "base"
          }
        )
    );

  sortedClientes.forEach(
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

      clienteFiltro.appendChild(
        option
      );
    }
  );

  const existe =
    selectedValue ===
      "TODOS" ||
    clientes.some(
      (cliente) =>
        cliente.id ===
        selectedValue
    );

  clienteFiltro.value =
    existe
      ? selectedValue
      : "TODOS";
}

// ============================================================
// CONSTRUIR DATOS DEL HISTORIAL
// ============================================================

function buildHistorialRows() {
  return pagos.map(
    (pago) => {
      const deuda =
        getDeuda(
          pago.deudaId
        );

      const estado =
        deuda
          ? getDebtStatus(
              deuda
            )
          : "PENDIENTE";

      return {
        ...pago,

        clienteNombre:
          getClienteName(
            pago.clienteId
          ),

        deudaConcepto:
          deuda?.concepto ||
          "Deuda no encontrada",

        saldo:
          Number(
            deuda?.saldo ||
            0
          ),

        estado
      };
    }
  );
}

// ============================================================
// APLICAR FILTROS
// ============================================================

function filterRows(
  rows
) {
  const clienteId =
    clienteFiltro?.value ||
    "TODOS";

  const inicio =
    fechaInicial?.value ||
    "";

  const fin =
    fechaFinal?.value ||
    "";

  const estado =
    estadoFiltro?.value ||
    "TODOS";

  return rows.filter(
    (row) => {
      // -----------------------------------------------
      // CLIENTE
      // -----------------------------------------------

      if (
        clienteId !==
          "TODOS" &&
        row.clienteId !==
          clienteId
      ) {
        return false;
      }

      // -----------------------------------------------
      // ESTADO
      // -----------------------------------------------

      if (
        estado !==
          "TODOS" &&
        row.estado !==
          estado
      ) {
        return false;
      }

      // -----------------------------------------------
      // FECHA INICIAL
      // -----------------------------------------------

      if (
        inicio &&
        String(
          row.fecha || ""
        ) < inicio
      ) {
        return false;
      }

      // -----------------------------------------------
      // FECHA FINAL
      // -----------------------------------------------

      if (
        fin &&
        String(
          row.fecha || ""
        ) > fin
      ) {
        return false;
      }

      return true;
    }
  );
}

// ============================================================
// RESUMEN
// ============================================================

function renderResumen(
  rows
) {
  // -----------------------------------------------
  // TOTAL COBRADO
  // -----------------------------------------------

  const total =
    rows.reduce(
      (sum, pago) =>
        sum +
        Number(
          pago.monto || 0
        ),
      0
    );

  // -----------------------------------------------
  // CLIENTES DISTINTOS
  // -----------------------------------------------

  const clientesConPago =
    new Set(
      rows
        .map(
          (pago) =>
            pago.clienteId
        )
        .filter(Boolean)
    );

  // -----------------------------------------------
  // PROMEDIO
  // -----------------------------------------------

  const promedio =
    rows.length > 0
      ? total /
        rows.length
      : 0;

  setText(
    historialTotalCobrado,
    formatCurrency(
      total
    )
  );

  setText(
    historialNumeroPagos,
    String(
      rows.length
    )
  );

  setText(
    historialClientes,
    String(
      clientesConPago.size
    )
  );

  setText(
    historialPromedio,
    formatCurrency(
      promedio
    )
  );
}

// ============================================================
// TABLA
// ============================================================

function renderHistorial() {
  const rows =
    filterRows(
      buildHistorialRows()
    );

  // Ordenar:
  // 1. Fecha del pago
  // 2. Fecha de registro
  rows.sort(
    (a, b) => {
      const fechaA =
        getDateTimestamp(
          a.fecha
        );

      const fechaB =
        getDateTimestamp(
          b.fecha
        );

      if (
        fechaB !==
        fechaA
      ) {
        return (
          fechaB -
          fechaA
        );
      }

      return (
        getDateTimestamp(
          b.fechaRegistro
        ) -
        getDateTimestamp(
          a.fechaRegistro
        )
      );
    }
  );

  // Actualizar indicadores
  renderResumen(
    rows
  );

  // Contador
  setText(
    historialCount,
    `${rows.length} ${
      rows.length === 1
        ? "pago mostrado"
        : "pagos mostrados"
    }`
  );

  if (
    !historialTableBody
  ) {
    return;
  }

  // Sin resultados
  if (
    rows.length ===
    0
  ) {
    appendEmptyRow(
      pagos.length === 0
        ? "Todavía no existen pagos registrados."
        : "No hay pagos que coincidan con los filtros seleccionados."
    );

    return;
  }

  historialTableBody.innerHTML =
    "";

  // -----------------------------------------------
  // FILAS
  // -----------------------------------------------

  rows.forEach(
    (pago) => {
      const row =
        document.createElement(
          "tr"
        );

      row.className =
        "transition hover:bg-slate-50";

      // Fecha
      const fecha =
        pago.fecha
          ? formatDate(
              `${pago.fecha}T00:00:00`
            )
          : "—";

      const values = [
        fecha,

        pago.clienteNombre,

        pago.deudaConcepto,

        formatCurrency(
          Number(
            pago.monto ||
            0
          )
        ),

        pago.metodoPago ||
          "—",

        formatCurrency(
          Number(
            pago.saldo ||
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

          // Alineación
          if (
            index === 3 ||
            index === 5
          ) {
            cell.className =
              "px-6 py-4 text-right text-sm text-slate-700";
          } else {
            cell.className =
              "px-6 py-4 text-sm text-slate-700";
          }

          // Cliente destacado
          if (
            index === 1
          ) {
            cell.className +=
              " font-bold text-slate-900";
          }

          // Pago destacado
          if (
            index === 3
          ) {
            cell.className +=
              " font-black text-emerald-700";
          }

          cell.textContent =
            value;

          row.appendChild(
            cell
          );
        }
      );

      // ---------------------------------------------
      // ESTADO
      // ---------------------------------------------

      const estadoCell =
        document.createElement(
          "td"
        );

      estadoCell.className =
        "px-6 py-4 text-center";

      const badge =
        document.createElement(
          "span"
        );

      badge.className =
        `badge ${
          getEstadoBadgeClass(
            pago.estado
          )
        }`;

      badge.textContent =
        pago.estado;

      estadoCell.appendChild(
        badge
      );

      row.appendChild(
        estadoCell
      );

      historialTableBody.appendChild(
        row
      );
    }
  );
}

// ============================================================
// VALIDAR RANGO DE FECHAS
// ============================================================

function validateDateRange() {
  if (
    !fechaInicial ||
    !fechaFinal
  ) {
    return true;
  }

  const inicio =
    fechaInicial.value;

  const fin =
    fechaFinal.value;

  if (
    inicio &&
    fin &&
    inicio > fin
  ) {
    fechaFinal.value =
      "";

    fechaFinal.setCustomValidity(
      ""
    );

    return true;
  }

  return true;
}

// ============================================================
// EVENTOS DE FILTROS
// ============================================================

clienteFiltro?.addEventListener(
  "change",
  () => {
    renderHistorial();
  }
);

fechaInicial?.addEventListener(
  "change",
  () => {
    validateDateRange();
    renderHistorial();
  }
);

fechaFinal?.addEventListener(
  "change",
  () => {
    validateDateRange();
    renderHistorial();
  }
);

estadoFiltro?.addEventListener(
  "change",
  () => {
    renderHistorial();
  }
);

// ============================================================
// LIMPIAR FILTROS
// ============================================================

limpiarFiltrosButton?.addEventListener(
  "click",
  () => {
    if (clienteFiltro) {
      clienteFiltro.value =
        "TODOS";
    }

    if (fechaInicial) {
      fechaInicial.value =
        "";
    }

    if (fechaFinal) {
      fechaFinal.value =
        "";
    }

    if (estadoFiltro) {
      estadoFiltro.value =
        "TODOS";
    }

    renderHistorial();
  }
);

// ============================================================
// LISTENERS FIRESTORE
// ============================================================

function startListeners() {
  // Limpiar listeners anteriores
  clientesUnsubscribe?.();
  deudasUnsubscribe?.();
  pagosUnsubscribe?.();

  // ==========================================================
  // CLIENTES
  // ==========================================================

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

        renderClienteFiltro();
        renderHistorial();
      },

      (error) => {
        console.error(
          "Error al cargar clientes:",
          error
        );

        renderLoadError(
          "clientes",
          error
        );
      }
    );

  // ==========================================================
  // DEUDAS
  // ==========================================================

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

        renderHistorial();
      },

      (error) => {
        console.error(
          "Error al cargar deudas:",
          error
        );

        renderLoadError(
          "deudas",
          error
        );
      }
    );

  // ==========================================================
  // PAGOS
  // ==========================================================

  pagosUnsubscribe =
    onSnapshot(
      pagosCollection,

      (snapshot) => {
        pagos =
          snapshot.docs.map(
            (pagoDoc) => ({
              id:
                pagoDoc.id,

              ...pagoDoc.data()
            })
          );

        renderHistorial();
      },

      (error) => {
        console.error(
          "Error al cargar pagos:",
          error
        );

        renderLoadError(
          "pagos",
          error
        );
      }
    );
}

// ============================================================
// MANEJO DE ERRORES
// ============================================================

function renderLoadError(
  label,
  error
) {
  console.error(
    `Error al cargar ${label}:`,
    error
  );

  appendEmptyRow(
    `No se pudo cargar ${label}. Revisa tu sesión y las reglas de Firestore.`
  );

  setText(
    historialCount,
    `Error al cargar ${label}`
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
