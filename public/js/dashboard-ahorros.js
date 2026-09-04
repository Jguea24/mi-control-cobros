// ============================================================
// public/js/dashboard-ahorros.js
// RESUMEN FINANCIERO PERSONAL
//
// Fórmula:
//
// SALDO DISPONIBLE
// = TOTAL COBRADO
// - TOTAL AHORRADO
// - TOTAL GASTADO
// ============================================================

import {
    collection,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase-config.js";

import {
    formatCurrency
} from "./utils.js";

// ============================================================
// ELEMENTOS DEL DASHBOARD
// ============================================================

// ------------------------------------------------------------
// TOTAL GANADO / COBRADO
// ------------------------------------------------------------

const totalGanadoElement =
    document.getElementById(
        "dashboardTotalGanado"
    );

const ganadoDetalleElement =
    document.getElementById(
        "dashboardGanadoDetalle"
    );

// ------------------------------------------------------------
// TOTAL AHORRADO
// ------------------------------------------------------------

const totalAhorradoElement =
    document.getElementById(
        "dashboardTotalAhorrado"
    );

const ahorradoDetalleElement =
    document.getElementById(
        "dashboardAhorradoDetalle"
    );

// ------------------------------------------------------------
// TOTAL GASTADO
// ------------------------------------------------------------

const totalGastadoElement =
    document.getElementById(
        "dashboardTotalGastado"
    );

const gastadoDetalleElement =
    document.getElementById(
        "dashboardGastadoDetalle"
    );

// ------------------------------------------------------------
// SALDO DISPONIBLE
// ------------------------------------------------------------

const saldoDisponibleElement =
    document.getElementById(
        "dashboardSaldoDisponible"
    );

const saldoDetalleElement =
    document.getElementById(
        "dashboardSaldoDetalle"
    );

// ============================================================
// VARIABLES
// ============================================================

let totalGanado = 0;
let totalAhorrado = 0;
let totalGastado = 0;

let cantidadPagos = 0;
let cantidadAhorros = 0;
let cantidadGastos = 0;

let unsubscribePagos = null;
let unsubscribeAhorros = null;
let unsubscribeGastos = null;

// ============================================================
// FORMATO DE DINERO
// ============================================================

function dinero(valor) {

    return formatCurrency(
        Number(valor) || 0
    );
}

// ============================================================
// ACTUALIZAR TODA LA VISTA
// ============================================================

function actualizarVista() {

    // ========================================================
    // TOTAL COBRADO
    // ========================================================

    if (totalGanadoElement) {

        totalGanadoElement.textContent =
            dinero(totalGanado);
    }

    if (ganadoDetalleElement) {

        ganadoDetalleElement.textContent =
            cantidadPagos === 1
                ? "1 pago registrado"
                : `${cantidadPagos} pagos registrados`;
    }

    // ========================================================
    // TOTAL AHORRADO
    // ========================================================

    if (totalAhorradoElement) {

        totalAhorradoElement.textContent =
            dinero(totalAhorrado);
    }

    if (ahorradoDetalleElement) {

        ahorradoDetalleElement.textContent =
            cantidadAhorros === 1
                ? "1 ahorro registrado"
                : `${cantidadAhorros} ahorros registrados`;
    }

    // ========================================================
    // TOTAL GASTADO
    // ========================================================

    if (totalGastadoElement) {

        totalGastadoElement.textContent =
            dinero(totalGastado);
    }

    if (gastadoDetalleElement) {

        gastadoDetalleElement.textContent =
            cantidadGastos === 1
                ? "1 gasto registrado"
                : `${cantidadGastos} gastos registrados`;
    }

    // ========================================================
    // SALDO DISPONIBLE
    //
    // EJEMPLO:
    //
    // 58 - 20 - 20 = 18
    // ========================================================

    const saldoDisponible =
        totalGanado
        - totalAhorrado
        - totalGastado;

    if (saldoDisponibleElement) {

        saldoDisponibleElement.textContent =
            dinero(saldoDisponible);

        // Eliminar colores anteriores
        saldoDisponibleElement.classList.remove(
            "text-blue-600",
            "text-emerald-600",
            "text-violet-600",
            "text-red-600"
        );

        // ----------------------------------------------------
        // SALDO POSITIVO
        // ----------------------------------------------------

        if (saldoDisponible > 0) {

            saldoDisponibleElement.classList.add(
                "text-violet-600"
            );
        }

        // ----------------------------------------------------
        // SALDO EN CERO
        // ----------------------------------------------------

        else if (saldoDisponible === 0) {

            saldoDisponibleElement.classList.add(
                "text-emerald-600"
            );
        }

        // ----------------------------------------------------
        // SALDO NEGATIVO
        // ----------------------------------------------------

        else {

            saldoDisponibleElement.classList.add(
                "text-red-600"
            );
        }
    }

    // ========================================================
    // DETALLE DEL SALDO
    // ========================================================

    if (saldoDetalleElement) {

        saldoDetalleElement.textContent =
            `${dinero(totalGanado)} ganado − ` +
            `${dinero(totalAhorrado)} ahorrado − ` +
            `${dinero(totalGastado)} gastado`;
    }

    // ========================================================
    // CONSOLA PARA COMPROBAR EL CÁLCULO
    // ========================================================

    console.log(
        "=========================================="
    );

    console.log(
        "[FINANZAS] Total cobrado:",
        totalGanado
    );

    console.log(
        "[FINANZAS] Total ahorrado:",
        totalAhorrado
    );

    console.log(
        "[FINANZAS] Total gastado:",
        totalGastado
    );

    console.log(
        "[FINANZAS] SALDO DISPONIBLE:",
        saldoDisponible
    );

    console.log(
        "=========================================="
    );
}

// ============================================================
// LIMPIAR VISTA
// ============================================================

function limpiarVista() {

    totalGanado = 0;
    totalAhorrado = 0;
    totalGastado = 0;

    cantidadPagos = 0;
    cantidadAhorros = 0;
    cantidadGastos = 0;

    actualizarVista();
}

// ============================================================
// DETENER LISTENERS
// ============================================================

function detenerListeners() {

    if (
        typeof unsubscribePagos ===
        "function"
    ) {

        unsubscribePagos();

        unsubscribePagos =
            null;
    }

    if (
        typeof unsubscribeAhorros ===
        "function"
    ) {

        unsubscribeAhorros();

        unsubscribeAhorros =
            null;
    }

    if (
        typeof unsubscribeGastos ===
        "function"
    ) {

        unsubscribeGastos();

        unsubscribeGastos =
            null;
    }
}

// ============================================================
// INICIAR LISTENERS
// ============================================================

function iniciarListeners(user) {

    detenerListeners();

    // ========================================================
    // PAGOS
    //
    // Los pagos representan el dinero ganado.
    //
    // Tu colección pagos actual no utiliza usuarioId,
    // por lo que se suman todos los pagos existentes.
    // ========================================================

    unsubscribePagos =
        onSnapshot(

            collection(
                db,
                "pagos"
            ),

            (snapshot) => {

                totalGanado = 0;

                cantidadPagos =
                    snapshot.size;

                snapshot.forEach(
                    (docSnapshot) => {

                        const data =
                            docSnapshot.data() ||
                            {};

                        const monto =
                            Number(
                                data.monto
                            );

                        if (
                            Number.isFinite(
                                monto
                            )
                        ) {

                            totalGanado +=
                                monto;
                        }
                    }
                );

                actualizarVista();
            },

            (error) => {

                console.error(
                    "[FINANZAS] Error leyendo pagos:",
                    error
                );

                totalGanado = 0;

                cantidadPagos = 0;

                actualizarVista();
            }
        );

    // ========================================================
    // AHORROS
    //
    // Solo los ahorros del usuario autenticado.
    // ========================================================

    const ahorrosQuery =
        query(
            collection(
                db,
                "ahorros"
            ),

            where(
                "usuarioId",
                "==",
                user.uid
            )
        );

    unsubscribeAhorros =
        onSnapshot(

            ahorrosQuery,

            (snapshot) => {

                totalAhorrado = 0;

                cantidadAhorros =
                    snapshot.size;

                snapshot.forEach(
                    (docSnapshot) => {

                        const data =
                            docSnapshot.data() ||
                            {};

                        const monto =
                            Number(
                                data.monto
                            );

                        if (
                            Number.isFinite(
                                monto
                            )
                        ) {

                            totalAhorrado +=
                                monto;
                        }
                    }
                );

                actualizarVista();
            },

            (error) => {

                console.error(
                    "[FINANZAS] Error leyendo ahorros:",
                    error
                );

                totalAhorrado = 0;

                cantidadAhorros = 0;

                actualizarVista();
            }
        );

    // ========================================================
    // GASTOS
    //
    // Solo los gastos del usuario autenticado.
    // ========================================================

    const gastosQuery =
        query(
            collection(
                db,
                "gastos"
            ),

            where(
                "usuarioId",
                "==",
                user.uid
            )
        );

    unsubscribeGastos =
        onSnapshot(

            gastosQuery,

            (snapshot) => {

                totalGastado = 0;

                cantidadGastos =
                    snapshot.size;

                snapshot.forEach(
                    (docSnapshot) => {

                        const data =
                            docSnapshot.data() ||
                            {};

                        const monto =
                            Number(
                                data.monto
                            );

                        if (
                            Number.isFinite(
                                monto
                            )
                        ) {

                            totalGastado +=
                                monto;
                        }
                    }
                );

                actualizarVista();
            },

            (error) => {

                console.error(
                    "[FINANZAS] Error leyendo gastos:",
                    error
                );

                totalGastado = 0;

                cantidadGastos = 0;

                actualizarVista();
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
            "[FINANZAS] Usuario:",
            user
                ? user.email
                : "No autenticado"
        );

        // ----------------------------------------------------
        // SIN USUARIO
        // ----------------------------------------------------

        if (!user) {

            detenerListeners();

            limpiarVista();

            return;
        }

        // ----------------------------------------------------
        // USUARIO AUTENTICADO
        // ----------------------------------------------------

        iniciarListeners(
            user
        );
    }
);

// ============================================================
// LIMPIAR AL SALIR
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        detenerListeners();
    }
);