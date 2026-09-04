// ============================================================
// public/js/gastos.js
// Gestión de gastos personales
// Mi Control de Cobros
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
// ELEMENTOS DEL DOM
// ============================================================

const periodoFiltro =
    document.getElementById("periodoFiltro");

const fechaInicialContainer =
    document.getElementById("fechaInicialContainer");

const fechaFinalContainer =
    document.getElementById("fechaFinalContainer");

const fechaInicial =
    document.getElementById("fechaInicial");

const fechaFinal =
    document.getElementById("fechaFinal");

const actualizarButton =
    document.getElementById("actualizarGastosButton");

// KPI
const gastoTotalPeriodo =
    document.getElementById("gastoTotalPeriodo");

const gastoTotalAcumulado =
    document.getElementById("gastoTotalAcumulado");

const gastoRegistros =
    document.getElementById("gastoRegistros");

const gastoPeriodoDetalle =
    document.getElementById("gastoPeriodoDetalle");

const gastoAcumuladoDetalle =
    document.getElementById("gastoAcumuladoDetalle");

// Categorías
const resumenCategoriasBody =
    document.getElementById("resumenCategoriasBody");

const resumenCategoriasEmpty =
    document.getElementById("resumenCategoriasEmpty");

// Tabla
const gastosTableBody =
    document.getElementById("gastosTableBody");

const gastosEmptyState =
    document.getElementById("gastosEmptyState");

const gastosCount =
    document.getElementById("gastosCount");

// ============================================================
// VARIABLES
// ============================================================

let gastosData = [];
let unsubscribeGastos = null;

// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        establecerFechas();
        actualizarVisibilidadFechas();
        actualizarVista();

    }
);

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            detenerListener();

            window.location.href =
                "login.html";

            return;
        }

        iniciarListener(
            user.uid
        );
    }
);

// ============================================================
// EVENTOS
// ============================================================

periodoFiltro?.addEventListener(
    "change",
    () => {

        actualizarVisibilidadFechas();
        actualizarVista();

    }
);

fechaInicial?.addEventListener(
    "change",
    actualizarVista
);

fechaFinal?.addEventListener(
    "change",
    actualizarVista
);

actualizarButton?.addEventListener(
    "click",
    actualizarVista
);

// ============================================================
// FIRESTORE
// ============================================================

function iniciarListener(uid) {

    detenerListener();

    console.log(
        "[GASTOS] Iniciando consulta para:",
        uid
    );

    const gastosQuery =
        query(
            collection(
                db,
                "gastos"
            ),
            where(
                "usuarioId",
                "==",
                uid
            )
        );

    unsubscribeGastos =
        onSnapshot(
            gastosQuery,

            (snapshot) => {

                gastosData =
                    snapshot.docs
                        .map(
                            (doc) => ({
                                id: doc.id,
                                ...doc.data()
                            })
                        )
                        .sort(
                            (a, b) => {

                                const fechaA =
                                    obtenerFechaNormalizada(
                                        a.fecha
                                    );

                                const fechaB =
                                    obtenerFechaNormalizada(
                                        b.fecha
                                    );

                                return fechaB.localeCompare(
                                    fechaA
                                );
                            }
                        );

                console.log(
                    "[GASTOS] Registros:",
                    gastosData.length
                );

                actualizarVista();
            },

            (error) => {

                console.error(
                    "❌ Error leyendo gastos:",
                    error
                );

                gastosData = [];

                actualizarVista();
            }
        );
}

// ============================================================
// DETENER LISTENER
// ============================================================

function detenerListener() {

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
// ACTUALIZAR VISTA
// ============================================================

function actualizarVista() {

    const periodo =
        obtenerRangoPeriodo();

    const registrosPeriodo =
        gastosData.filter(
            (gasto) => {

                const fecha =
                    obtenerFechaNormalizada(
                        gasto.fecha
                    );

                return (
                    fecha &&
                    fecha >= periodo.inicio &&
                    fecha <= periodo.fin
                );
            }
        );

    const totalPeriodo =
        sumarMontos(
            registrosPeriodo
        );

    const totalAcumulado =
        sumarMontos(
            gastosData
        );

    // ========================================================
    // KPI
    // ========================================================

    setText(
        gastoTotalPeriodo,
        formatCurrency(
            totalPeriodo
        )
    );

    setText(
        gastoTotalAcumulado,
        formatCurrency(
            totalAcumulado
        )
    );

    setText(
        gastoRegistros,
        String(
            registrosPeriodo.length
        )
    );

    setText(
        gastoPeriodoDetalle,
        obtenerTextoPeriodo()
    );

    setText(
        gastoAcumuladoDetalle,
        cantidadTexto(
            gastosData.length,
            "registro"
        )
    );

    // ========================================================
    // TABLA DE CATEGORÍAS
    // ========================================================

    renderCategorias(
        registrosPeriodo
    );

    // ========================================================
    // TABLA DE GASTOS
    // ========================================================

    renderTabla(
        registrosPeriodo
    );
}

// ============================================================
// CATEGORÍAS
// ============================================================

function renderCategorias(
    registros
) {

    if (!resumenCategoriasBody) {
        return;
    }

    const categorias = {};

    registros.forEach(
        (gasto) => {

            const categoria =
                (gasto.categoria || "Otros")
                    .trim();

            categorias[categoria] =
                (
                    categorias[categoria] ||
                    0
                ) +
                obtenerMonto(
                    gasto.monto
                );
        }
    );

    const items =
        Object.entries(
            categorias
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );

    if (
        items.length === 0
    ) {

        resumenCategoriasBody.innerHTML =
            "";

        resumenCategoriasEmpty
            ?.classList
            .remove("hidden");

        return;
    }

    resumenCategoriasEmpty
        ?.classList
        .add("hidden");

    const total =
        items.reduce(
            (suma, [, monto]) =>
                suma + monto,
            0
        );

    resumenCategoriasBody.innerHTML =
        items
            .map(
                ([categoria, monto]) => {

                    const porcentaje =
                        total > 0
                            ? (
                                monto /
                                total
                            ) * 100
                            : 0;

                    return `
                        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">

                            <td class="px-4 py-3 text-sm font-bold text-slate-950">
                                ${escaparHTML(categoria)}
                            </td>

                            <td class="px-4 py-3">
                                <div class="h-2 w-full rounded-full bg-slate-100">

                                    <div
                                        class="h-2 rounded-full bg-rose-500 transition-all"
                                        style="width:${Math.min(
                                            porcentaje,
                                            100
                                        )}%"
                                    ></div>

                                </div>
                            </td>

                            <td class="px-4 py-3 text-right text-sm font-black text-slate-950 whitespace-nowrap">
                                ${formatCurrency(monto)}
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}

// ============================================================
// TABLA DE GASTOS
// ============================================================

function renderTabla(
    registros
) {

    if (!gastosTableBody) {
        return;
    }

    setText(
        gastosCount,
        String(
            registros.length
        )
    );

    if (
        registros.length === 0
    ) {

        gastosTableBody.innerHTML =
            "";

        gastosEmptyState
            ?.classList
            .remove("hidden");

        gastosEmptyState
            ?.classList
            .add("flex");

        return;
    }

    gastosEmptyState
        ?.classList
        .add("hidden");

    gastosEmptyState
        ?.classList
        .remove("flex");

    gastosTableBody.innerHTML =
        registros
            .map(
                (gasto) => {

                    const fecha =
                        obtenerFechaNormalizada(
                            gasto.fecha
                        );

                    const categoria =
                        escaparHTML(
                            gasto.categoria ||
                            "Otros"
                        );

                    const descripcion =
                        escaparHTML(
                            gasto.descripcion ||
                            "—"
                        );

                    const monto =
                        obtenerMonto(
                            gasto.monto
                        );

                    return `
                        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">

                            <td class="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                ${formatearFecha(
                                    fecha
                                )}
                            </td>

                            <td class="px-4 py-3">
                                <span class="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">
                                    ${categoria}
                                </span>
                            </td>

                            <td class="px-4 py-3 text-sm text-slate-700">
                                ${descripcion}
                            </td>

                            <td class="px-4 py-3 text-right text-sm font-black text-rose-600 whitespace-nowrap">
                                ${formatCurrency(
                                    monto
                                )}
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}

// ============================================================
// RANGO
// ============================================================

function obtenerRangoPeriodo() {

    const hoy =
        new Date();

    hoy.setHours(
        0,
        0,
        0,
        0
    );

    const tipo =
        periodoFiltro?.value ||
        "mes";

    // --------------------------------------------------------
    // HOY
    // --------------------------------------------------------

    if (
        tipo === "hoy"
    ) {

        const fecha =
            convertirDateAISO(
                hoy
            );

        return {
            inicio: fecha,
            fin: fecha
        };
    }

    // --------------------------------------------------------
    // SEMANA
    // --------------------------------------------------------

    if (
        tipo === "semana"
    ) {

        const dia =
            hoy.getDay();

        const diferencia =
            dia === 0
                ? 6
                : dia - 1;

        const inicio =
            new Date(hoy);

        inicio.setDate(
            inicio.getDate() -
            diferencia
        );

        const fin =
            new Date(inicio);

        fin.setDate(
            fin.getDate() +
            6
        );

        return {
            inicio:
                convertirDateAISO(
                    inicio
                ),

            fin:
                convertirDateAISO(
                    fin
                )
        };
    }

    // --------------------------------------------------------
    // PERSONALIZADO
    // --------------------------------------------------------

    if (
        tipo === "personalizado"
    ) {

        let inicio =
            fechaInicial?.value ||
            convertirDateAISO(
                hoy
            );

        let fin =
            fechaFinal?.value ||
            convertirDateAISO(
                hoy
            );

        if (
            inicio > fin
        ) {

            [
                inicio,
                fin
            ] = [
                fin,
                inicio
            ];
        }

        return {
            inicio,
            fin
        };
    }

    // --------------------------------------------------------
    // MES
    // --------------------------------------------------------

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
        inicio:
            convertirDateAISO(
                inicio
            ),

        fin:
            convertirDateAISO(
                fin
            )
    };
}

// ============================================================
// VISIBILIDAD DE FECHAS
// ============================================================

function actualizarVisibilidadFechas() {

    const personalizado =
        periodoFiltro?.value ===
        "personalizado";

    fechaInicialContainer
        ?.classList
        .toggle(
            "hidden",
            !personalizado
        );

    fechaFinalContainer
        ?.classList
        .toggle(
            "hidden",
            !personalizado
        );
}

// ============================================================
// TEXTO PERÍODO
// ============================================================

function obtenerTextoPeriodo() {

    switch (
        periodoFiltro?.value
    ) {

        case "hoy":
            return "Hoy";

        case "semana":
            return "Esta semana";

        case "personalizado":
            return "Período personalizado";

        default:
            return "Este mes";
    }
}

// ============================================================
// FECHAS
// ============================================================

function establecerFechas() {

    const hoy =
        convertirDateAISO(
            new Date()
        );

    if (fechaInicial) {
        fechaInicial.value =
            hoy;
    }

    if (fechaFinal) {
        fechaFinal.value =
            hoy;
    }
}

// ============================================================
// MONTO
// ============================================================

function obtenerMonto(
    valor
) {

    const monto =
        Number(
            valor
        );

    return Number.isFinite(
        monto
    )
        ? monto
        : 0;
}

// ============================================================
// SUMAR
// ============================================================

function sumarMontos(
    registros
) {

    return registros.reduce(
        (
            total,
            registro
        ) => {

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

function obtenerFechaNormalizada(
    valor
) {

    if (!valor) {
        return "";
    }

    // Firebase Timestamp
    if (
        typeof valor === "object" &&
        typeof valor.toDate ===
        "function"
    ) {

        return convertirDateAISO(
            valor.toDate()
        );
    }

    // Timestamp serializado
    if (
        typeof valor === "object" &&
        typeof valor.seconds ===
        "number"
    ) {

        return convertirDateAISO(
            new Date(
                valor.seconds *
                1000
            )
        );
    }

    // Date
    if (
        valor instanceof Date
    ) {

        return convertirDateAISO(
            valor
        );
    }

    // YYYY-MM-DD
    if (
        typeof valor === "string" &&
        /^\d{4}-\d{2}-\d{2}$/
            .test(valor)
    ) {

        return valor;
    }

    // DD/MM/YYYY
    if (
        typeof valor === "string" &&
        /^\d{2}\/\d{2}\/\d{4}$/
            .test(valor)
    ) {

        const [
            dia,
            mes,
            anio
        ] =
            valor.split("/");

        return `${anio}-${mes}-${dia}`;
    }

    return "";
}

// ============================================================
// DATE → ISO
// ============================================================

function convertirDateAISO(
    fecha
) {

    const yyyy =
        fecha.getFullYear();

    const mm =
        String(
            fecha.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dd =
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${yyyy}-${mm}-${dd}`;
}

// ============================================================
// FORMATO FECHA
// ============================================================

function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "—";
    }

    const [
        yyyy,
        mm,
        dd
    ] =
        fecha.split("-");

    return `${dd}/${mm}/${yyyy}`;
}

// ============================================================
// TEXTO
// ============================================================

function cantidadTexto(
    cantidad,
    tipo
) {

    if (cantidad === 1) {
        return `1 ${tipo}`;
    }

    return `${cantidad} ${tipo}s`;
}

// ============================================================
// DOM TEXT
// ============================================================

function setText(
    element,
    value
) {

    if (element) {
        element.textContent =
            value;
    }
}

// ============================================================
// SEGURIDAD HTML
// ============================================================

function escaparHTML(
    texto
) {

    return String(texto)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

// ============================================================
// LIMPIAR
// ============================================================

window.addEventListener(
    "beforeunload",
    detenerListener
);