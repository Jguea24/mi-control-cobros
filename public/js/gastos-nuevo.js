// ============================================================
// public/js/gastos-nuevo.js
// Registrar gasto personal
// Mi Control de Cobros
// ============================================================

import {
    collection,
    addDoc,
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
// DOM
// ============================================================

const form =
    document.getElementById(
        "gastoForm"
    );

const fechaInput =
    document.getElementById(
        "fecha"
    );

const montoInput =
    document.getElementById(
        "monto"
    );

const categoriaInput =
    document.getElementById(
        "categoria"
    );

const descripcionInput =
    document.getElementById(
        "descripcion"
    );

// Errores
const fechaError =
    document.getElementById(
        "fechaError"
    );

const montoError =
    document.getElementById(
        "montoError"
    );

const categoriaError =
    document.getElementById(
        "categoriaError"
    );

const descripcionError =
    document.getElementById(
        "descripcionError"
    );

// Resumen
const resumenMonto =
    document.getElementById(
        "resumenMonto"
    );

// Mensaje
const formMessage =
    document.getElementById(
        "formMessage"
    );

const formMessageIcon =
    document.getElementById(
        "formMessageIcon"
    );

const formMessageTitle =
    document.getElementById(
        "formMessageTitle"
    );

const formMessageText =
    document.getElementById(
        "formMessageText"
    );

// Botón
const guardarButton =
    document.getElementById(
        "guardarGastoButton"
    );

const guardarIcon =
    document.getElementById(
        "guardarGastoIcon"
    );

const guardarSpinner =
    document.getElementById(
        "guardarGastoSpinner"
    );

const guardarText =
    document.getElementById(
        "guardarGastoText"
    );

// ============================================================
// USUARIO
// ============================================================

let usuarioActual =
    null;

// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        establecerFechaHoy();

        actualizarResumen();

        validarFormulario();

    }
);

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
    auth,
    (user) => {

        usuarioActual =
            user;

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        validarFormulario();
    }
);

// ============================================================
// EVENTOS DE INPUT
// ============================================================

[
    fechaInput,
    montoInput,
    categoriaInput,
    descripcionInput
]
    .filter(Boolean)
    .forEach(
        (element) => {

            element.addEventListener(
                "input",
                () => {

                    ocultarMensaje();
                    validarFormulario();

                }
            );

            element.addEventListener(
                "change",
                () => {

                    ocultarMensaje();
                    validarFormulario();

                }
            );
        }
    );

// ============================================================
// FECHA DE HOY
// ============================================================

function establecerFechaHoy() {

    if (!fechaInput) {
        return;
    }

    const fecha =
        new Date();

    fechaInput.value =
        convertirDateAISO(
            fecha
        );
}

// ============================================================
// VALIDACIÓN
// ============================================================

function validarFormulario() {

    limpiarErrores();

    let valido =
        true;

    const fecha =
        fechaInput?.value.trim() ||
        "";

    const monto =
        Number(
            montoInput?.value
        );

    const categoria =
        categoriaInput?.value.trim() ||
        "";

    const descripcion =
        descripcionInput?.value.trim() ||
        "";

    // --------------------------------------------------------
    // FECHA
    // --------------------------------------------------------

    if (!fecha) {

        mostrarError(
            fechaError,
            "Selecciona una fecha."
        );

        marcarError(
            fechaInput
        );

        valido = false;
    }

    // --------------------------------------------------------
    // MONTO
    // --------------------------------------------------------

    if (
        !Number.isFinite(monto) ||
        monto <= 0
    ) {

        mostrarError(
            montoError,
            "Ingresa un monto mayor a $0,00."
        );

        marcarError(
            montoInput
        );

        valido = false;

    } else if (
        monto > 999999999
    ) {

        mostrarError(
            montoError,
            "El monto es demasiado alto."
        );

        marcarError(
            montoInput
        );

        valido = false;
    }

    // --------------------------------------------------------
    // CATEGORÍA
    // --------------------------------------------------------

    if (!categoria) {

        mostrarError(
            categoriaError,
            "Selecciona una categoría."
        );

        marcarError(
            categoriaInput
        );

        valido = false;
    }

    // --------------------------------------------------------
    // DESCRIPCIÓN
    // --------------------------------------------------------

    if (!descripcion) {

        mostrarError(
            descripcionError,
            "Describe brevemente el gasto."
        );

        marcarError(
            descripcionInput
        );

        valido = false;

    } else if (
        descripcion.length >
        200
    ) {

        mostrarError(
            descripcionError,
            "Máximo 200 caracteres."
        );

        marcarError(
            descripcionInput
        );

        valido = false;
    }

    // --------------------------------------------------------
    // BOTÓN
    // --------------------------------------------------------

    if (guardarButton) {

        guardarButton.disabled =
            !valido ||
            !usuarioActual;
    }

    actualizarResumen();

    return valido;
}

// ============================================================
// ERRORES
// ============================================================

function mostrarError(
    element,
    mensaje
) {

    if (!element) {
        return;
    }

    element.textContent =
        mensaje;

    element.classList.toggle(
        "hidden",
        !mensaje
    );
}

function limpiarErrores() {

    [
        fechaError,
        montoError,
        categoriaError,
        descripcionError
    ]
        .filter(Boolean)
        .forEach(
            (element) => {

                element.textContent =
                    "";

                element.classList.add(
                    "hidden"
                );
            }
        );

    [
        fechaInput,
        montoInput,
        categoriaInput,
        descripcionInput
    ]
        .filter(Boolean)
        .forEach(
            (element) => {

                element.classList.remove(
                    "border-red-400",
                    "bg-red-50"
                );
            }
        );
}

function marcarError(
    element
) {

    element?.classList.add(
        "border-red-400",
        "bg-red-50"
    );
}

// ============================================================
// RESUMEN
// ============================================================

function actualizarResumen() {

    if (!resumenMonto) {
        return;
    }

    const monto =
        Number(
            montoInput?.value
        );

    resumenMonto.textContent =
        Number.isFinite(monto) &&
        monto > 0
            ? formatoMoneda(monto)
            : formatoMoneda(0);
}

// ============================================================
// MONEDA
// ============================================================

function formatoMoneda(
    valor
) {

    return new Intl.NumberFormat(
        "es-EC",
        {
            style:
                "currency",

            currency:
                "USD",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    )
        .format(
            valor
        );
}

// ============================================================
// MENSAJES
// ============================================================

function mostrarMensaje(
    tipo,
    titulo,
    texto
) {

    if (!formMessage) {
        return;
    }

    formMessage.className =
        "mb-5 rounded-xl border px-4 py-3";

    if (
        tipo === "success"
    ) {

        formMessage.classList.add(
            "border-emerald-200",
            "bg-emerald-50",
            "text-emerald-700"
        );

        if (formMessageIcon) {
            formMessageIcon.textContent =
                "✓";
        }

    } else {

        formMessage.classList.add(
            "border-red-200",
            "bg-red-50",
            "text-red-700"
        );

        if (formMessageIcon) {
            formMessageIcon.textContent =
                "!";
        }
    }

    if (formMessageTitle) {
        formMessageTitle.textContent =
            titulo;
    }

    if (formMessageText) {
        formMessageText.textContent =
            texto;
    }

    formMessage.classList.remove(
        "hidden"
    );
}

function ocultarMensaje() {

    formMessage?.classList.add(
        "hidden"
    );
}

// ============================================================
// BOTÓN
// ============================================================

function cambiarEstadoBoton(
    guardando
) {

    if (!guardarButton) {
        return;
    }

    guardarButton.disabled =
        guardando;

    guardarIcon?.classList.toggle(
        "hidden",
        guardando
    );

    guardarSpinner?.classList.toggle(
        "hidden",
        !guardando
    );

    if (guardarText) {

        guardarText.textContent =
            guardando
                ? "Guardando..."
                : "Guardar gasto";
    }
}

// ============================================================
// GUARDAR
// ============================================================

form?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        ocultarMensaje();

        if (!usuarioActual) {

            mostrarMensaje(
                "error",
                "Sesión no disponible",
                "Inicia sesión nuevamente."
            );

            return;
        }

        if (!validarFormulario()) {
            return;
        }

        const gastoData = {

            monto:
                Number(
                    Number(
                        montoInput.value
                    ).toFixed(2)
                ),

            fecha:
                fechaInput.value,

            categoria:
                categoriaInput.value.trim(),

            descripcion:
                descripcionInput.value.trim(),

            usuarioId:
                usuarioActual.uid,

            usuarioEmail:
                usuarioActual.email || "",

            fechaRegistro:
                serverTimestamp()

        };

        console.log(
            "[GASTOS] Datos:",
            gastoData
        );

        cambiarEstadoBoton(
            true
        );

        try {

            const documento =
                await addDoc(
                    collection(
                        db,
                        "gastos"
                    ),
                    gastoData
                );

            console.log(
                "[GASTOS] Guardado:",
                documento.id
            );

            mostrarMensaje(
                "success",
                "Gasto registrado",
                "El gasto se guardó correctamente."
            );

            form.reset();

            establecerFechaHoy();

            actualizarResumen();

            validarFormulario();

            setTimeout(
                () => {

                    window.location.href =
                        "gastos.html";

                },
                700
            );

        } catch (error) {

            console.error(
                "❌ Error guardando gasto:",
                error
            );

            if (
                error?.code ===
                "permission-denied"
            ) {

                mostrarMensaje(
                    "error",
                    "No se pudo guardar",
                    "Firebase rechazó la escritura. Verifica las reglas de Firestore de la colección 'gastos'."
                );

            } else {

                mostrarMensaje(
                    "error",
                    "No se pudo guardar",
                    "Ocurrió un error al registrar el gasto."
                );
            }

        } finally {

            cambiarEstadoBoton(
                false
            );

            validarFormulario();
        }
    }
);

// ============================================================
// FECHA
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