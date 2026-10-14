import {
  collection,
  onSnapshot,
  orderBy,
  query
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

const clientesCollection = collection(db, "clientes");
const deudasCollection = collection(db, "deudas");
const pagosCollection = collection(db, "pagos");

// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const dashboardDate = document.querySelector("#dashboardDate");
const totalPorCobrar = document.querySelector("#totalPorCobrar");
const porCobrarDetalle = document.querySelector("#porCobrarDetalle");
const totalCobrado = document.querySelector("#totalCobrado");
const cobradoDetalle = document.querySelector("#cobradoDetalle");
const deudasPendientes = document.querySelector("#deudasPendientes");
const deudasVencidas = document.querySelector("#deudasVencidas");
const totalClientes = document.querySelector("#totalClientes");
const clientesDetalle = document.querySelector("#clientesDetalle");

const ultimasDeudasCount =
  document.querySelector("#ultimasDeudasCount");

const ultimosPagosCount =
  document.querySelector("#ultimosPagosCount");

const ultimasDeudasBody =
  document.querySelector("#ultimasDeudasBody");

const ultimosPagosBody =
  document.querySelector("#ultimosPagosBody");

// Gráficos
const deudasChartCanvas =
  document.querySelector("#deudasChart");

const clientesChartCanvas =
  document.querySelector("#clientesChart");

const pagosChartCanvas =
  document.querySelector("#pagosChart");

const finanzasChartCanvas =
  document.querySelector("#finanzasChart");

// Descripciones
const deudasChartDetalle =
  document.querySelector("#deudasChartDetalle");

const clientesChartDetalle =
  document.querySelector("#clientesChartDetalle");

const pagosChartDetalle =
  document.querySelector("#pagosChartDetalle");

const finanzasChartDetalle =
  document.querySelector("#finanzasChartDetalle");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];
let pagos = [];

let clientesUnsubscribe = null;
let deudasUnsubscribe = null;
let pagosUnsubscribe = null;

let listenersActivos = false;

let deudasChartInstance = null;
let clientesChartInstance = null;
let pagosChartInstance = null;
let finanzasChartInstance = null;

// ============================================================
// FECHA DEL DASHBOARD
// ============================================================

function updateDashboardDate() {
  if (!dashboardDate) return;

  const fecha =
    new Intl.DateTimeFormat("es-EC", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date());

  setText(dashboardDate, fecha);
}

updateDashboardDate();

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function getClienteName(clienteId) {
  const cliente =
    clientes.find(
      (item) => item.id === clienteId
    );

  return cliente?.nombre ||
    "Cliente no encontrado";
}

function getEstadoBadgeClass(estado) {
  const classes = {
    PAGADO: "paid",
    PENDIENTE: "pending",
    VENCIDA: "overdue"
  };

  return classes[estado] || "inactive";
}

function appendEmptyRow(
  tbody,
  colspan,
  message
) {
  if (!tbody) return;

  tbody.innerHTML = "";

  const row =
    document.createElement("tr");

  const cell =
    document.createElement("td");

  cell.colSpan = colspan;

  cell.textContent = message;

  cell.className =
    "px-5 py-10 text-center text-sm font-medium text-slate-400";

  row.appendChild(cell);
  tbody.appendChild(row);
}

function clearListeners() {
  clientesUnsubscribe?.();
  deudasUnsubscribe?.();
  pagosUnsubscribe?.();

  clientesUnsubscribe = null;
  deudasUnsubscribe = null;
  pagosUnsubscribe = null;

  listenersActivos = false;
}

function destroyCharts() {
  deudasChartInstance?.destroy();
  clientesChartInstance?.destroy();
  pagosChartInstance?.destroy();
  finanzasChartInstance?.destroy();

  deudasChartInstance = null;
  clientesChartInstance = null;
  pagosChartInstance = null;
  finanzasChartInstance = null;
}

function hasChartLibrary() {
  return typeof window.Chart !== "undefined";
}

// ============================================================
// RESUMEN DE DEUDAS
// ============================================================

function getDebtSummary() {
  const withStatus =
    deudas.map((deuda) => ({
      ...deuda,
      estadoActual:
        getDebtStatus(deuda)
    }));

  const porCobrar =
    withStatus
      .filter(
        (deuda) =>
          Number(deuda.saldo || 0) > 0
      )
      .reduce(
        (total, deuda) =>
          total +
          Number(deuda.saldo || 0),
        0
      );

  const pendientes =
    withStatus.filter(
      (deuda) =>
        deuda.estadoActual ===
        "PENDIENTE"
    ).length;

  const pagadas =
    withStatus.filter(
      (deuda) =>
        deuda.estadoActual ===
        "PAGADO"
    ).length;

  const vencidas =
    withStatus.filter(
      (deuda) =>
        deuda.estadoActual ===
        "VENCIDA"
    ).length;

  return {
    withStatus,
    porCobrar,
    pendientes,
    pagadas,
    vencidas
  };
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

function renderStats() {
  const summary =
    getDebtSummary();

  const cobrado =
    pagos.reduce(
      (total, pago) =>
        total +
        Number(pago.monto || 0),
      0
    );

  const activos =
    clientes.filter(
      (cliente) =>
        cliente.activo !== false
    ).length;

  const deudasConSaldo =
    deudas.filter(
      (deuda) =>
        Number(deuda.saldo || 0) > 0
    ).length;

  setText(
    totalPorCobrar,
    formatCurrency(
      summary.porCobrar
    )
  );

  setText(
    porCobrarDetalle,
    `${deudasConSaldo} ${
      deudasConSaldo === 1
        ? "deuda"
        : "deudas"
    } con saldo`
  );

  setText(
    totalCobrado,
    formatCurrency(cobrado)
  );

  setText(
    cobradoDetalle,
    `${pagos.length} ${
      pagos.length === 1
        ? "pago registrado"
        : "pagos registrados"
    }`
  );

  setText(
    deudasPendientes,
    String(
      summary.pendientes
    )
  );

  setText(
    deudasVencidas,
    String(
      summary.vencidas
    )
  );

  setText(
    totalClientes,
    String(
      clientes.length
    )
  );

  setText(
    clientesDetalle,
    `${activos} ${
      activos === 1
        ? "activo"
        : "activos"
    }`
  );
}

// ============================================================
// TABLA: ÚLTIMAS DEUDAS
// ============================================================

function renderUltimasDeudas() {
  const ultimas =
    deudas.slice(0, 6);

  setText(
    ultimasDeudasCount,
    `${deudas.length} ${
      deudas.length === 1
        ? "deuda registrada"
        : "deudas registradas"
    }`
  );

  if (!ultimasDeudasBody) return;

  ultimasDeudasBody.innerHTML = "";

  if (ultimas.length === 0) {
    appendEmptyRow(
      ultimasDeudasBody,
      6,
      "No hay deudas registradas."
    );

    return;
  }

  ultimas.forEach(
    (deuda) => {
      const row =
        document.createElement("tr");

      row.className =
        "transition hover:bg-slate-50";

      const fecha =
        deuda.fecha
          ? formatDate(
              `${deuda.fecha}T00:00:00`
            )
          : formatDate(
              deuda.fechaRegistro
            );

      const values = [
        getClienteName(
          deuda.clienteId
        ),
        deuda.concepto || "-",
        formatCurrency(
          deuda.monto
        ),
        formatCurrency(
          deuda.saldo
        ),
        fecha || "-"
      ];

      values.forEach(
        (value) => {
          const cell =
            document.createElement(
              "td"
            );

          cell.className =
            "px-5 py-4 text-sm text-slate-700";

          cell.textContent =
            value;

          row.appendChild(cell);
        }
      );

      const estadoCell =
        document.createElement(
          "td"
        );

      estadoCell.className =
        "px-5 py-4";

      const badge =
        document.createElement(
          "span"
        );

      const estado =
        getDebtStatus(deuda);

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

      ultimasDeudasBody.appendChild(
        row
      );
    }
  );
}

// ============================================================
// TABLA: ÚLTIMOS PAGOS
// ============================================================

function renderUltimosPagos() {
  const ultimos =
    pagos.slice(0, 6);

  setText(
    ultimosPagosCount,
    `${pagos.length} ${
      pagos.length === 1
        ? "pago registrado"
        : "pagos registrados"
    }`
  );

  if (!ultimosPagosBody) return;

  ultimosPagosBody.innerHTML = "";

  if (ultimos.length === 0) {
    appendEmptyRow(
      ultimosPagosBody,
      4,
      "No hay pagos registrados."
    );

    return;
  }

  ultimos.forEach(
    (pago) => {
      const row =
        document.createElement(
          "tr"
        );

      row.className =
        "transition hover:bg-slate-50";

      const values = [
        getClienteName(
          pago.clienteId
        ),
        formatCurrency(
          pago.monto
        ),
        pago.fecha
          ? formatDate(
              `${pago.fecha}T00:00:00`
            )
          : "-",
        pago.metodoPago || "-"
      ];

      values.forEach(
        (value) => {
          const cell =
            document.createElement(
              "td"
            );

          cell.className =
            "px-5 py-4 text-sm text-slate-700";

          cell.textContent =
            value;

          row.appendChild(cell);
        }
      );

      ultimosPagosBody.appendChild(
        row
      );
    }
  );
}

// ============================================================
// FECHAS PARA GRÁFICOS
// ============================================================

function getChartDateKey(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value
      .toISOString()
      .slice(0, 10);
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    const date =
      value.toDate();

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date
        .toISOString()
        .slice(0, 10);
    }
  }

  return null;
}

function formatChartDate(
  dateKey
) {
  if (!dateKey) {
    return "Sin fecha";
  }

  const date =
    new Date(
      `${dateKey}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      day: "2-digit",
      month: "2-digit"
    }
  ).format(date);
}

function buildPaymentsByDate() {
  const totals =
    new Map();

  pagos.forEach(
    (pago) => {
      const dateKey =
        getChartDateKey(
          pago.fecha ||
          pago.fechaRegistro
        );

      if (!dateKey) return;

      const current =
        totals.get(dateKey) ||
        0;

      totals.set(
        dateKey,
        current +
        Number(
          pago.monto || 0
        )
      );
    }
  );

  return [...totals.entries()]
    .sort(
      ([a], [b]) =>
        a.localeCompare(b)
    )
    .slice(-12);
}

// ============================================================
// GRÁFICOS INTERACTIVOS
// ============================================================

function renderCharts() {
  if (!hasChartLibrary()) {
    console.warn(
      "Chart.js no está disponible."
    );

    return;
  }

  destroyCharts();

  const summary =
    getDebtSummary();

  const cobrado =
    pagos.reduce(
      (total, pago) =>
        total +
        Number(
          pago.monto || 0
        ),
      0
    );

  const activos =
    clientes.filter(
      (cliente) =>
        cliente.activo !== false
    ).length;

  const inactivos =
    Math.max(
      clientes.length -
      activos,
      0
    );

  const paymentEntries =
    buildPaymentsByDate();

  // ----------------------------------------------------------
  // GRÁFICO 1: ESTADO DE DEUDAS
  // ----------------------------------------------------------

  if (deudasChartCanvas) {
    deudasChartInstance =
      new Chart(
        deudasChartCanvas,
        {
          type: "bar",

          data: {
            labels: [
              "Pendientes",
              "Pagadas",
              "Vencidas"
            ],

            datasets: [
              {
                label: "Cantidad",

                data: [
                  summary.pendientes,
                  summary.pagadas,
                  summary.vencidas
                ],

                backgroundColor: [
                  "#f59e0b",
                  "#10b981",
                  "#ef4444"
                ],

                borderRadius: 10,

                borderSkipped: false,

                maxBarThickness: 70
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                callbacks: {
                  label:
                    (context) =>
                      `${context.raw} deudas`
                }
              }
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  precision: 0
                }
              },

              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        }
      );
  }

  if (deudasChartDetalle) {
    deudasChartDetalle.textContent =
      `${summary.pendientes} pendientes · ` +
      `${summary.pagadas} pagadas · ` +
      `${summary.vencidas} vencidas`;
  }

  // ----------------------------------------------------------
  // GRÁFICO 2: ESTADO DE CLIENTES
  // ----------------------------------------------------------

  if (clientesChartCanvas) {
    clientesChartInstance =
      new Chart(
        clientesChartCanvas,
        {
          type: "doughnut",

          data: {
            labels: [
              "Activos",
              "Inactivos"
            ],

            datasets: [
              {
                data: [
                  activos,
                  inactivos
                ],

                backgroundColor: [
                  "#8b5cf6",
                  "#cbd5e1"
                ],

                borderColor:
                  "#ffffff",

                borderWidth: 4,

                hoverOffset: 8
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {
              legend: {
                position:
                  "bottom",

                labels: {
                  usePointStyle:
                    true,

                  padding: 18
                }
              },

              tooltip: {
                callbacks: {
                  label:
                    (context) => {
                      const total =
                        clientes.length;

                      const value =
                        Number(
                          context.raw ||
                          0
                        );

                      const percentage =
                        total > 0
                          ? (
                              (
                                value /
                                total
                              ) *
                              100
                            ).toFixed(
                              1
                            )
                          : "0.0";

                      return (
                        `${context.label}: ` +
                        `${value} ` +
                        `(${percentage}%)`
                      );
                    }
                }
              }
            }
          }
        }
      );
  }

  if (clientesChartDetalle) {
    clientesChartDetalle.textContent =
      `${activos} activos · ` +
      `${inactivos} inactivos`;
  }

  // ----------------------------------------------------------
  // GRÁFICO 3: EVOLUCIÓN DE PAGOS
  // ----------------------------------------------------------

  if (pagosChartCanvas) {
    pagosChartInstance =
      new Chart(
        pagosChartCanvas,
        {
          type: "line",

          data: {
            labels:
              paymentEntries.map(
                ([dateKey]) =>
                  formatChartDate(
                    dateKey
                  )
              ),

            datasets: [
              {
                label: "Pagos",

                data:
                  paymentEntries.map(
                    ([, amount]) =>
                      Number(
                        amount.toFixed(
                          2
                        )
                      )
                  ),

                borderColor:
                  "#10b981",

                backgroundColor:
                  "rgba(16, 185, 129, 0.12)",

                pointBackgroundColor:
                  "#10b981",

                pointBorderColor:
                  "#ffffff",

                pointBorderWidth:
                  2,

                pointRadius: 4,

                pointHoverRadius:
                  6,

                fill: true,

                tension: 0.35
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            interaction: {
              intersect: false,

              mode: "index"
            },

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                callbacks: {
                  label:
                    (context) =>
                      `Cobrado: ` +
                      `${formatCurrency(
                        context.raw
                      )}`
                }
              }
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback:
                    (value) =>
                      formatCurrency(
                        value
                      )
                }
              },

              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        }
      );
  }

  if (pagosChartDetalle) {
    pagosChartDetalle.textContent =
      paymentEntries.length
        ? `Últimas ${paymentEntries.length} fechas con pagos registrados`
        : "Todavía no hay pagos con fecha disponible";
  }

  // ----------------------------------------------------------
  // GRÁFICO 4: SITUACIÓN FINANCIERA
  // ----------------------------------------------------------

  if (finanzasChartCanvas) {
    finanzasChartInstance =
      new Chart(
        finanzasChartCanvas,
        {
          type: "bar",

          data: {
            labels: [
              "Cobrado",
              "Por cobrar"
            ],

            datasets: [
              {
                label: "Monto",

                data: [
                  Number(
                    cobrado.toFixed(2)
                  ),

                  Number(
                    summary.porCobrar.toFixed(
                      2
                    )
                  )
                ],

                backgroundColor: [
                  "#10b981",
                  "#3b82f6"
                ],

                borderColor: [
                  "#059669",
                  "#2563eb"
                ],

                borderWidth: 1,

                borderRadius: 10,

                maxBarThickness: 110
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                callbacks: {
                  label:
                    (context) =>
                      formatCurrency(
                        context.raw
                      )
                }
              }
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback:
                    (value) =>
                      formatCurrency(
                        value
                      )
                }
              },

              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        }
      );
  }

  if (finanzasChartDetalle) {
    finanzasChartDetalle.textContent =
      `Cobrado: ${formatCurrency(
        cobrado
      )} · Por cobrar: ${formatCurrency(
        summary.porCobrar
      )}`;
  }
}

// ============================================================
// RENDER GENERAL
// ============================================================

function renderDashboard() {
  renderStats();
  renderCharts();
  renderUltimasDeudas();
  renderUltimosPagos();
}

// ============================================================
// ERRORES
// ============================================================

function renderLoadError(
  targetBody,
  colspan,
  countElement,
  label,
  error
) {
  console.error(
    `[DASHBOARD] Error al cargar ${label}:`,
    error
  );

  appendEmptyRow(
    targetBody,
    colspan,
    `No se pudieron cargar ${label}.`
  );

  setText(
    countElement,
    `Error al cargar ${label}`
  );
}

// ============================================================
// LISTENERS FIRESTORE
// ============================================================

function startListeners() {
  if (listenersActivos) return;

  listenersActivos = true;

  // ----------------------------------------------------------
  // CLIENTES
  // ----------------------------------------------------------

  clientesUnsubscribe =
    onSnapshot(
      query(
        clientesCollection,
        orderBy(
          "nombre",
          "asc"
        )
      ),

      (snapshot) => {
        clientes =
          snapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data()
            })
          );

        renderDashboard();
      },

      (error) => {
        renderLoadError(
          ultimasDeudasBody,
          6,
          ultimasDeudasCount,
          "clientes",
          error
        );
      }
    );

  // ----------------------------------------------------------
  // DEUDAS
  // ----------------------------------------------------------

  deudasUnsubscribe =
    onSnapshot(
      query(
        deudasCollection,
        orderBy(
          "fechaRegistro",
          "desc"
        )
      ),

      (snapshot) => {
        deudas =
          snapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data()
            })
          );

        renderDashboard();
      },

      (error) => {
        renderLoadError(
          ultimasDeudasBody,
          6,
          ultimasDeudasCount,
          "deudas",
          error
        );
      }
    );

  // ----------------------------------------------------------
  // PAGOS
  // ----------------------------------------------------------

  pagosUnsubscribe =
    onSnapshot(
      query(
        pagosCollection,
        orderBy(
          "fecha",
          "desc"
        )
      ),

      (snapshot) => {
        pagos =
          snapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data()
            })
          );

        renderDashboard();
      },

      (error) => {
        renderLoadError(
          ultimosPagosBody,
          4,
          ultimosPagosCount,
          "pagos",
          error
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
    console.log(
      "[DASHBOARD] Estado:",
      user
        ? `Autenticado (${user.email})`
        : "No autenticado"
    );

    if (!user) {
      clearListeners();

      clientes = [];
      deudas = [];
      pagos = [];

      destroyCharts();

      return;
    }

    startListeners();
  }
);
