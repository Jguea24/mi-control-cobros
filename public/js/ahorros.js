// ============================================================
// public/js/ahorros.js
// MÓDULO DE AHORROS
// Mi Control de Cobros
// ============================================================

import {
    collection,
    onSnapshot,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase-config.js";

import {
    formatCurrency,
    setText
} from "./utils.js";

// ============================================================
// DOM
// ============================================================

const periodoFiltro = document.getElementById("periodoFiltro");

const fechaInicialContainer =
    document.getElementById("fechaInicialContainer");

const fechaFinalContainer =
    document.getElementById("fechaFinalContainer");

const fechaInicial =
    document.getElementById("fechaInicial");

const fechaFinal =
    document.getElementById("fechaFinal");

const actualizarAhorroButton =
    document.getElementById("actualizarAhorroButton");

// KPIs
const ahorroGanadoHoy =
    document.getElementById("ahorroGanadoHoy");

const ahorroAhorradoHoy =
    document.getElementById("ahorroAhorradoHoy");

const ahorroGanadoPeriodo =
    document.getElementById("ahorroGanadoPeriodo");

const ahorroAhorradoPeriodo =
    document.getElementById("ahorroAhorradoPeriodo");

const ahorroGanadoHoyDetalle =
    document.getElementById("ahorroGanadoHoyDetalle");

const ahorroAhorradoHoyDetalle =
    document.getElementById("ahorroAhorradoHoyDetalle");

const ahorroGanadoPeriodoDetalle =
    document.getElementById("ahorroGanadoPeriodoDetalle");

const ahorroAhorradoPeriodoDetalle =
    document.getElementById("ahorroAhorradoPeriodoDetalle");

// Financiero
const ahorroPorcentaje =
    document.getElementById("ahorroPorcentaje");

const ahorroPorcentajeDetalle =
    document.getElementById("ahorroPorcentajeDetalle");

const ahorroDisponiblePeriodo =
    document.getElementById("ahorroDisponiblePeriodo");

const ahorroTotalAcumulado =
    document.getElementById("ahorroTotalAcumulado");

// Acumulados
const ahorroGanadoAcumulado =
    document.getElementById("ahorroGanadoAcumulado");

const ahorroGanadoAcumuladoDetalle =
    document.getElementById("ahorroGanadoAcumuladoDetalle");

const ahorroSaldoTotal =
    document.getElementById("ahorroSaldoTotal");

const ahorroSaldoTotalDetalle =
    document.getElementById("ahorroSaldoTotalDetalle");

// Tabla
const ahorrosCount =
    document.getElementById("ahorrosCount");

const ahorrosTableBody =
    document.getElementById("ahorrosTableBody");

const ahorrosEmptyState =
    document.getElementById("ahorrosEmptyState");

// Resumen mensual
const resumenMensualBody =
    document.getElementById("resumenMensualBody");

const resumenMensualEmpty =
    document.getElementById("resumenMensualEmpty");

const resumenMensualTotalGanado =
    document.getElementById("resumenMensualTotalGanado");

const resumenMensualTotalAhorrado =
    document.getElementById("resumenMensualTotalAhorrado");

const resumenMensualSaldo =
    document.getElementById("resumenMensualSaldo");

// ============================================================
// DATOS
// ============================================================

let pagosData = [];
let ahorrosData = [];

let usuarioActual = null;

let unsubscribePagos = null;
let unsubscribeAhorros = null;

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("✅ ahorros.js cargado correctamente");

    establecerPeriodoInicial();
    inicializarEventos();
    actualizarVisibilidadFechas();
    actualizarVista();
});

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(auth, (user) => {

    console.log(
        "[AHORROS] Usuario:",
        user ? user.email || user.uid : "NO AUTENTICADO"
    );

    usuarioActual = user;

    if (!user) {

        detenerListeners();

        window.location.href = "login.html";

        return;
    }

    iniciarListeners();
});

// ============================================================
// PERÍODO INICIAL
// ============================================================

function establecerPeriodoInicial() {

    if (periodoFiltro) {

        const opcionMes =
            [...periodoFiltro.options].find(
                option => option.value === "mes"
            );

        if (opcionMes) {
            periodoFiltro.value = "mes";
        }
    }

    const hoy = obtenerFechaHoy();

    if (fechaInicial) {
        fechaInicial.value = hoy;
    }

    if (fechaFinal) {
        fechaFinal.value = hoy;
    }
}

// ============================================================
// EVENTOS
// ============================================================

function inicializarEventos() {

    periodoFiltro?.addEventListener("change", () => {

        actualizarVisibilidadFechas();

        actualizarVista();
    });

    actualizarAhorroButton?.addEventListener("click", () => {

        actualizarVista();
    });

    fechaInicial?.addEventListener("change", () => {

        if (periodoFiltro?.value === "personalizado") {
            actualizarVista();
        }
    });

    fechaFinal?.addEventListener("change", () => {

        if (periodoFiltro?.value === "personalizado") {
            actualizarVista();
        }
    });
}

// ============================================================
// MOSTRAR / OCULTAR FECHAS
// ============================================================

function actualizarVisibilidadFechas() {

    const personalizado =
        periodoFiltro?.value === "personalizado";

    fechaInicialContainer?.classList.toggle(
        "hidden",
        !personalizado
    );

    fechaFinalContainer?.classList.toggle(
        "hidden",
        !personalizado
    );
}

// ============================================================
// FIRESTORE
// ============================================================

function iniciarListeners() {

    detenerListeners();

    if (!usuarioActual) {
        return;
    }

    console.log("📡 Conectando Ahorros con Firestore...");

    // ========================================================
    // PAGOS
    // ========================================================

    const pagosQuery = query(
        collection(db, "pagos"),
        orderBy("fecha", "desc")
    );

    unsubscribePagos = onSnapshot(
        pagosQuery,

        (snapshot) => {

            pagosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(
                "✅ PAGOS cargados:",
                pagosData.length
            );

            actualizarVista();
        },

        (error) => {

            console.error(
                "❌ Error al leer pagos:",
                error
            );

            pagosData = [];

            actualizarVista();

            mostrarErrorGanancias(
                "No se pudieron cargar las ganancias."
            );
        }
    );

    // ========================================================
    // AHORROS
    // ========================================================

    const ahorrosQuery = query(
        collection(db, "ahorros"),
        orderBy("fecha", "desc")
    );

    unsubscribeAhorros = onSnapshot(
        ahorrosQuery,

        (snapshot) => {

            ahorrosData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(ahorro =>
                    ahorro.usuarioId === usuarioActual.uid
                );

            console.log(
                "✅ AHORROS del usuario cargados:",
                ahorrosData.length
            );

            actualizarVista();
        },

        (error) => {

            console.error(
                "❌ Error al leer ahorros:",
                error
            );

            ahorrosData = [];

            actualizarVista();

            mostrarErrorAhorros(
                "No se pudieron cargar los ahorros."
            );
        }
    );
}

// ============================================================
// DETENER LISTENERS
// ============================================================

function detenerListeners() {

    if (typeof unsubscribePagos === "function") {
        unsubscribePagos();
        unsubscribePagos = null;
    }

    if (typeof unsubscribeAhorros === "function") {
        unsubscribeAhorros();
        unsubscribeAhorros = null;
    }
}

// ============================================================
// ACTUALIZAR VISTA
// ============================================================

function actualizarVista() {

    actualizarResumen();

    actualizarTablaAhorros();

    actualizarResumenMensual();
}

// ============================================================
// RESUMEN PRINCIPAL
// ============================================================

function actualizarResumen() {

    const hoy = obtenerFechaHoy();

    const periodo = obtenerRangoPeriodo();

    // ========================================================
    // PAGOS DE HOY
    // ========================================================

    const pagosHoy = pagosData.filter(pago => {

        return (
            obtenerFechaNormalizada(pago.fecha) === hoy
        );
    });

    const ganadoHoy = sumarMontos(pagosHoy);

    // ========================================================
    // AHORROS DE HOY
    // ========================================================

    const ahorrosHoy = ahorrosData.filter(ahorro => {

        return (
            obtenerFechaNormalizada(ahorro.fecha) === hoy
        );
    });

    const ahorradoHoy = sumarMontos(ahorrosHoy);

    // ========================================================
    // PAGOS DEL PERÍODO
    // ========================================================

    const pagosPeriodo = pagosData.filter(pago => {

        const fecha =
            obtenerFechaNormalizada(pago.fecha);

        return (
            fecha &&
            fecha >= periodo.inicio &&
            fecha <= periodo.fin
        );
    });

    // ========================================================
    // AHORROS DEL PERÍODO
    // ========================================================

    const ahorrosPeriodo = ahorrosData.filter(ahorro => {

        const fecha =
            obtenerFechaNormalizada(ahorro.fecha);

        return (
            fecha &&
            fecha >= periodo.inicio &&
            fecha <= periodo.fin
        );
    });

    // ========================================================
    // TOTALES
    // ========================================================

    const ganadoPeriodo =
        sumarMontos(pagosPeriodo);

    const ahorradoPeriodo =
        sumarMontos(ahorrosPeriodo);

    const disponiblePeriodo =
        ganadoPeriodo - ahorradoPeriodo;

    // ========================================================
    // PORCENTAJE
    // ========================================================

    let porcentaje = 0;

    if (ganadoPeriodo > 0) {

        porcentaje =
            (ahorradoPeriodo / ganadoPeriodo) * 100;
    }

    porcentaje =
        Math.max(0, porcentaje);

    // ========================================================
    // ACUMULADOS
    // ========================================================

    const ganadoAcumulado =
        sumarMontos(pagosData);

    const ahorroAcumulado =
        sumarMontos(ahorrosData);

    const saldoTotal =
        ganadoAcumulado - ahorroAcumulado;

    // ========================================================
    // HOY
    // ========================================================

    setText(
        ahorroGanadoHoy,
        formatCurrency(ganadoHoy)
    );

    setText(
        ahorroGanadoHoyDetalle,
        cantidadTexto(
            pagosHoy.length,
            "pago"
        )
    );

    setText(
        ahorroAhorradoHoy,
        formatCurrency(ahorradoHoy)
    );

    setText(
        ahorroAhorradoHoyDetalle,
        cantidadTexto(
            ahorrosHoy.length,
            "ahorro"
        )
    );

    // ========================================================
    // PERÍODO
    // ========================================================

    setText(
        ahorroGanadoPeriodo,
        formatCurrency(ganadoPeriodo)
    );

    setText(
        ahorroGanadoPeriodoDetalle,
        obtenerTextoPeriodo()
    );

    setText(
        ahorroAhorradoPeriodo,
        formatCurrency(ahorradoPeriodo)
    );

    setText(
        ahorroAhorradoPeriodoDetalle,
        obtenerTextoPeriodo()
    );

    // ========================================================
    // PORCENTAJE
    // ========================================================

    setText(
        ahorroPorcentaje,
        `${porcentaje.toFixed(2)}%`
    );

    setText(
        ahorroPorcentajeDetalle,

        ganadoPeriodo > 0
            ? `${formatCurrency(ahorradoPeriodo)} de ${formatCurrency(ganadoPeriodo)}`
            : "Sin ganancias registradas"
    );

    // ========================================================
    // DISPONIBLE
    // ========================================================

    setText(
        ahorroDisponiblePeriodo,
        formatCurrency(disponiblePeriodo)
    );

    actualizarColorDisponible(
        disponiblePeriodo
    );

    // ========================================================
    // AHORRO ACUMULADO
    // ========================================================

    setText(
        ahorroTotalAcumulado,
        formatCurrency(ahorroAcumulado)
    );

    // ========================================================
    // GANADO ACUMULADO
    // ========================================================

    setText(
        ahorroGanadoAcumulado,
        formatCurrency(ganadoAcumulado)
    );

    setText(
        ahorroGanadoAcumuladoDetalle,
        cantidadTexto(
            pagosData.length,
            "pago"
        )
    );

    // ========================================================
    // SALDO TOTAL
    // ========================================================

    setText(
        ahorroSaldoTotal,
        formatCurrency(saldoTotal)
    );

    setText(
        ahorroSaldoTotalDetalle,

        `${formatCurrency(ganadoAcumulado)} ganado − ${formatCurrency(ahorroAcumulado)} ahorrado`
    );

    actualizarColorSaldoTotal(
        saldoTotal
    );
}

// ============================================================
// RESUMEN MENSUAL
// ============================================================

function actualizarResumenMensual() {

    if (!resumenMensualBody) {
        return;
    }

    const meses = {};

    // ========================================================
    // PAGOS
    // ========================================================

    pagosData.forEach(pago => {

        const fecha =
            obtenerFechaNormalizada(pago.fecha);

        if (!fecha) {
            return;
        }

        const mes =
            fecha.substring(0, 7);

        if (!meses[mes]) {

            meses[mes] = {
                ganado: 0,
                ahorrado: 0
            };
        }

        meses[mes].ganado +=
            obtenerMonto(pago.monto);
    });

    // ========================================================
    // AHORROS
    // ========================================================

    ahorrosData.forEach(ahorro => {

        const fecha =
            obtenerFechaNormalizada(ahorro.fecha);

        if (!fecha) {
            return;
        }

        const mes =
            fecha.substring(0, 7);

        if (!meses[mes]) {

            meses[mes] = {
                ganado: 0,
                ahorrado: 0
            };
        }

        meses[mes].ahorrado +=
            obtenerMonto(ahorro.monto);
    });

    // ========================================================
    // ORDENAR
    // ========================================================

    const mesesOrdenados =
        Object.keys(meses).sort(
            (a, b) => b.localeCompare(a)
        );

    // ========================================================
    // SIN DATOS
    // ========================================================

    if (mesesOrdenados.length === 0) {

        resumenMensualBody.innerHTML = "";

        resumenMensualEmpty?.classList.remove(
            "hidden"
        );

        setText(
            resumenMensualTotalGanado,
            formatCurrency(0)
        );

        setText(
            resumenMensualTotalAhorrado,
            formatCurrency(0)
        );

        setText(
            resumenMensualSaldo,
            formatCurrency(0)
        );

        return;
    }

    resumenMensualEmpty?.classList.add(
        "hidden"
    );

    // ========================================================
    // GENERAR TABLA
    // ========================================================

    let totalGanado = 0;
    let totalAhorrado = 0;

    resumenMensualBody.innerHTML =
        mesesOrdenados.map(mes => {

            const ganado =
                meses[mes].ganado;

            const ahorrado =
                meses[mes].ahorrado;

            const saldo =
                ganado - ahorrado;

            totalGanado += ganado;
            totalAhorrado += ahorrado;

            return `
                <tr class="hover:bg-slate-50 transition">

                    <td class="px-5 py-4 text-sm font-bold text-slate-800">
                        ${formatearMes(mes)}
                    </td>

                    <td class="px-5 py-4 text-right text-sm font-bold text-blue-600 whitespace-nowrap">
                        ${formatCurrency(ganado)}
                    </td>

                    <td class="px-5 py-4 text-right text-sm font-bold text-emerald-600 whitespace-nowrap">
                        ${formatCurrency(ahorrado)}
                    </td>

                    <td class="px-5 py-4 text-right text-sm font-bold whitespace-nowrap ${obtenerClaseSaldo(saldo)}">
                        ${formatCurrency(saldo)}
                    </td>

                </tr>
            `;
        }).join("");

    // ========================================================
    // TOTALES
    // ========================================================

    setText(
        resumenMensualTotalGanado,
        formatCurrency(totalGanado)
    );

    setText(
        resumenMensualTotalAhorrado,
        formatCurrency(totalAhorrado)
    );

    setText(
        resumenMensualSaldo,
        formatCurrency(
            totalGanado - totalAhorrado
        )
    );
}

// ============================================================
// TABLA DE AHORROS
// ============================================================

function actualizarTablaAhorros() {

    if (!ahorrosTableBody) {
        return;
    }

    const periodo =
        obtenerRangoPeriodo();

    const registros =
        ahorrosData
            .filter(ahorro => {

                const fecha =
                    obtenerFechaNormalizada(
                        ahorro.fecha
                    );

                return (
                    fecha &&
                    fecha >= periodo.inicio &&
                    fecha <= periodo.fin
                );
            })
            .sort((a, b) => {

                const fechaA =
                    obtenerFechaNormalizada(a.fecha);

                const fechaB =
                    obtenerFechaNormalizada(b.fecha);

                return fechaB.localeCompare(fechaA);
            });

    setText(
        ahorrosCount,
        String(registros.length)
    );

    if (registros.length === 0) {

        ahorrosTableBody.innerHTML = "";

        ahorrosEmptyState?.classList.remove(
            "hidden"
        );

        ahorrosEmptyState?.classList.add(
            "flex"
        );

        return;
    }

    ahorrosEmptyState?.classList.add(
        "hidden"
    );

    ahorrosEmptyState?.classList.remove(
        "flex"
    );

    ahorrosTableBody.innerHTML =
        registros.map(ahorro => {

            const fecha =
                obtenerFechaNormalizada(
                    ahorro.fecha
                );

            const concepto =
                escaparHTML(
                    ahorro.concepto || "Ahorro"
                );

            const monto =
                obtenerMonto(
                    ahorro.monto
                );

            const observacion =
                escaparHTML(
                    ahorro.observacion || "—"
                );

            return `
                <tr class="hover:bg-slate-50 transition">

                    <td class="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                        ${formatearFechaVisual(fecha)}
                    </td>

                    <td class="px-5 py-4 text-sm font-medium text-slate-800">
                        ${concepto}
                    </td>

                    <td class="px-5 py-4 text-right text-sm font-bold text-emerald-600 whitespace-nowrap">
                        ${formatCurrency(monto)}
                    </td>

                    <td class="px-5 py-4 text-sm text-slate-500">
                        ${observacion}
                    </td>

                    <td class="px-5 py-4 text-center">
                        <span class="badge badge-ahorro">
                            AHORRADO
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}

// ============================================================
// RANGO DE FECHAS
// ============================================================

function obtenerRangoPeriodo() {

    const hoy = new Date();

    hoy.setHours(
        0,
        0,
        0,
        0
    );

    const tipo =
        periodoFiltro?.value || "mes";

    // ========================================================
    // HOY
    // ========================================================

    if (tipo === "hoy") {

        const fecha =
            convertirDateAISO(hoy);

        return {
            inicio: fecha,
            fin: fecha
        };
    }

    // ========================================================
    // SEMANA
    // LUNES - DOMINGO
    // ========================================================

    if (tipo === "semana") {

        const dia =
            hoy.getDay();

        const diferencia =
            dia === 0 ? 6 : dia - 1;

        const inicio =
            new Date(hoy);

        inicio.setDate(
            inicio.getDate() - diferencia
        );

        const fin =
            new Date(inicio);

        fin.setDate(
            fin.getDate() + 6
        );

        return {
            inicio: convertirDateAISO(inicio),
            fin: convertirDateAISO(fin)
        };
    }

    // ========================================================
    // MES ACTUAL
    // ========================================================

    if (tipo === "mes") {

        const inicio =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                1
            );

        const fin =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth() + 1,
                0
            );

        return {
            inicio: convertirDateAISO(inicio),
            fin: convertirDateAISO(fin)
        };
    }

    // ========================================================
    // PERSONALIZADO
    // ========================================================

    if (tipo === "personalizado") {

        let inicio =
            fechaInicial?.value ||
            convertirDateAISO(hoy);

        let fin =
            fechaFinal?.value ||
            convertirDateAISO(hoy);

        if (inicio > fin) {

            const temporal = inicio;

            inicio = fin;
            fin = temporal;
        }

        return {
            inicio,
            fin
        };
    }

    const fecha =
        convertirDateAISO(hoy);

    return {
        inicio: fecha,
        fin: fecha
    };
}

// ============================================================
// TEXTO DEL PERÍODO
// ============================================================

function obtenerTextoPeriodo() {

    switch (periodoFiltro?.value) {

        case "hoy":
            return "Hoy";

        case "semana":
            return "Esta semana";

        case "mes":
            return "Este mes";

        case "personalizado":
            return "Período personalizado";

        default:
            return "Este mes";
    }
}

// ============================================================
// FECHA ACTUAL
// ============================================================

function obtenerFechaHoy() {

    return convertirDateAISO(
        new Date()
    );
}

// ============================================================
// MONTO
// ============================================================

function obtenerMonto(valor) {

    const monto = Number(valor);

    return Number.isFinite(monto)
        ? monto
        : 0;
}

// ============================================================
// SUMAR MONTOS
// ============================================================

function sumarMontos(registros) {

    return registros.reduce(
        (total, registro) => {

            return (
                total +
                obtenerMonto(
                    registro.monto
                )
            );

        },
        0
    );
}

// ============================================================
// NORMALIZAR FECHA
// ============================================================

function obtenerFechaNormalizada(valor) {

    if (!valor) {
        return "";
    }

    // Firebase Timestamp
    if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {

        return convertirDateAISO(
            valor.toDate()
        );
    }

    // Timestamp serializado
    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {

        return convertirDateAISO(
            new Date(
                valor.seconds * 1000
            )
        );
    }

    // Date
    if (valor instanceof Date) {

        return convertirDateAISO(valor);
    }

    // YYYY-MM-DD
    if (
        typeof valor === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {

        return valor;
    }

    // DD/MM/YYYY
    if (
        typeof valor === "string" &&
        /^\d{2}\/\d{2}\/\d{4}$/.test(valor)
    ) {

        const partes =
            valor.split("/");

        return `
            ${partes[2]}-${partes[1]}-${partes[0]}
        `.replace(/\s/g, "");
    }

    // Texto convertible
    if (typeof valor === "string") {

        const fecha =
            new Date(valor);

        if (!Number.isNaN(fecha.getTime())) {

            return convertirDateAISO(
                fecha
            );
        }
    }

    // Timestamp numérico
    if (typeof valor === "number") {

        const fecha =
            new Date(valor);

        if (!Number.isNaN(fecha.getTime())) {

            return convertirDateAISO(
                fecha
            );
        }
    }

    return "";
}

// ============================================================
// DATE → ISO
// ============================================================

function convertirDateAISO(fecha) {

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            fecha.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ============================================================
// FECHA VISUAL
// ============================================================

function formatearFechaVisual(fecha) {

    if (!fecha) {
        return "—";
    }

    const partes =
        fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ============================================================
// MES VISUAL
// ============================================================

function formatearMes(mes) {

    const partes =
        mes.split("-");

    if (partes.length !== 2) {
        return mes;
    }

    const anio =
        Number(partes[0]);

    const numeroMes =
        Number(partes[1]);

    const fecha =
        new Date(
            anio,
            numeroMes - 1,
            1
        );

    return new Intl.DateTimeFormat(
        "es-EC",
        {
            month: "long",
            year: "numeric"
        }
    )
        .format(fecha)
        .replace(
            /^./,
            letra => letra.toUpperCase()
        );
}

// ============================================================
// CLASE DEL SALDO
// ============================================================

function obtenerClaseSaldo(valor) {

    if (valor > 0) {
        return "text-blue-600";
    }

    if (valor === 0) {
        return "text-emerald-600";
    }

    return "text-red-600";
}

// ============================================================
// COLOR DISPONIBLE
// ============================================================

function actualizarColorDisponible(valor) {

    if (!ahorroDisponiblePeriodo) {
        return;
    }

    ahorroDisponiblePeriodo.classList.remove(
        "text-blue-600",
        "text-emerald-600",
        "text-red-600"
    );

    ahorroDisponiblePeriodo.classList.add(
        obtenerClaseSaldo(valor)
    );
}

// ============================================================
// COLOR SALDO TOTAL
// ============================================================

function actualizarColorSaldoTotal(valor) {

    if (!ahorroSaldoTotal) {
        return;
    }

    ahorroSaldoTotal.classList.remove(
        "text-blue-600",
        "text-emerald-600",
        "text-red-600"
    );

    ahorroSaldoTotal.classList.add(
        obtenerClaseSaldo(valor)
    );
}

// ============================================================
// TEXTO DE CANTIDAD
// ============================================================

function cantidadTexto(cantidad, tipo) {

    if (cantidad === 0) {

        return tipo === "pago"
            ? "Sin pagos registrados"
            : "Sin ahorros registrados";
    }

    if (cantidad === 1) {

        return tipo === "pago"
            ? "1 pago registrado"
            : "1 ahorro registrado";
    }

    return tipo === "pago"
        ? `${cantidad} pagos registrados`
        : `${cantidad} ahorros registrados`;
}

// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// ERROR GANANCIAS
// ============================================================

function mostrarErrorGanancias(mensaje) {

    setText(
        ahorroGanadoHoyDetalle,
        mensaje
    );

    setText(
        ahorroGanadoPeriodoDetalle,
        mensaje
    );
}

// ============================================================
// ERROR AHORROS
// ============================================================

function mostrarErrorAhorros(mensaje) {

    if (!ahorrosTableBody) {
        return;
    }

    ahorrosTableBody.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="px-5 py-12 text-center"
            >
                <p class="text-sm font-medium text-red-600">
                    ${escaparHTML(mensaje)}
                </p>
            </td>
        </tr>
    `;
}

// ============================================================
// LIMPIAR
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {
        detenerListeners();
    }
);