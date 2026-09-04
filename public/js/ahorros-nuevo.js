// ============================================================
// public/js/ahorro-nuevo.js
// REGISTRAR AHORRO PERSONAL
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
// ELEMENTOS DEL DOM
// ============================================================

const ahorroForm =
    document.getElementById("ahorroForm");

const fechaInput =
    document.getElementById("fecha");

const montoInput =
    document.getElementById("monto");

const conceptoInput =
    document.getElementById("concepto");

const observacionInput =
    document.getElementById("observacion");

const fechaError =
    document.getElementById("fechaError");

const montoError =
    document.getElementById("montoError");

const conceptoError =
    document.getElementById("conceptoError");

const formMessage =
    document.getElementById("formMessage");

const formMessageIcon =
    document.getElementById("formMessageIcon");

const formMessageTitle =
    document.getElementById("formMessageTitle");

const formMessageText =
    document.getElementById("formMessageText");

const resumenMonto =
    document.getElementById("resumenMonto");

const guardarAhorroButton =
    document.getElementById("guardarAhorroButton");

const guardarAhorroIcon =
    document.getElementById("guardarAhorroIcon");

const guardarAhorroSpinner =
    document.getElementById("guardarAhorroSpinner");

const guardarAhorroText =
    document.getElementById("guardarAhorroText");

// ============================================================
// ESTADO
// ============================================================

let usuarioActual = null;

// ============================================================
// FECHA ACTUAL
// ============================================================

function obtenerFechaHoy() {

    const hoy =
        new Date();

    const anio =
        hoy.getFullYear();

    const mes =
        String(
            hoy.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dia =
        String(
            hoy.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${anio}-${mes}-${dia}`;
}

// ============================================================
// MONEDA
// ============================================================

function formatearMoneda(
    valor
) {

    return new Intl.NumberFormat(
        "es-EC",
        {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        valor
    );
}

// ============================================================
// MOSTRAR ERROR
// ============================================================

function mostrarError(
    elemento,
    mensaje
) {

    if (!elemento) {
        return;
    }

    elemento.textContent =
        mensaje;

    elemento.classList.remove(
        "hidden"
    );
}

// ============================================================
// OCULTAR ERROR
// ============================================================

function ocultarError(
    elemento
) {

    if (!elemento) {
        return;
    }

    elemento.textContent =
        "";

    elemento.classList.add(
        "hidden"
    );
}

// ============================================================
// LIMPIAR ERRORES
// ============================================================

function limpiarErrores() {

    ocultarError(
        fechaError
    );

    ocultarError(
        montoError
    );

    ocultarError(
        conceptoError
    );
}

// ============================================================
// MOSTRAR MENSAJE
// ============================================================

function mostrarMensaje(
    tipo,
    titulo,
    mensaje
) {

    if (!formMessage) {
        return;
    }

    formMessage.classList.remove(
        "hidden",
        "bg-green-50",
        "border-green-200",
        "text-green-800",
        "bg-red-50",
        "border-red-200",
        "text-red-800",
        "bg-yellow-50",
        "border-yellow-200",
        "text-yellow-800"
    );

    if (
        tipo === "success"
    ) {

        formMessage.classList.add(
            "bg-green-50",
            "border-green-200",
            "text-green-800"
        );

        if (
            formMessageIcon
        ) {

            formMessageIcon.textContent =
                "✓";
        }

    } else if (
        tipo === "warning"
    ) {

        formMessage.classList.add(
            "bg-yellow-50",
            "border-yellow-200",
            "text-yellow-800"
        );

        if (
            formMessageIcon
        ) {

            formMessageIcon.textContent =
                "!";
        }

    } else {

        formMessage.classList.add(
            "bg-red-50",
            "border-red-200",
            "text-red-800"
        );

        if (
            formMessageIcon
        ) {

            formMessageIcon.textContent =
                "!";
        }
    }

    if (
        formMessageTitle
    ) {

        formMessageTitle.textContent =
            titulo;
    }

    if (
        formMessageText
    ) {

        formMessageText.textContent =
            mensaje;
    }

    formMessage.classList.remove(
        "hidden"
    );
}

// ============================================================
// OCULTAR MENSAJE
// ============================================================

function ocultarMensaje() {

    if (!formMessage) {
        return;
    }

    formMessage.classList.add(
        "hidden"
    );

    if (
        formMessageTitle
    ) {

        formMessageTitle.textContent =
            "";
    }

    if (
        formMessageText
    ) {

        formMessageText.textContent =
            "";
    }
}

// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

function actualizarResumenMonto() {

    if (!resumenMonto) {
        return;
    }

    const monto =
        Number(
            montoInput?.value || 0
        );

    if (
        !Number.isFinite(monto) ||
        monto <= 0
    ) {

        resumenMonto.textContent =
            "$0.00";

        return;
    }

    resumenMonto.textContent =
        formatearMoneda(
            monto
        );
}

// ============================================================
// ESTADO GUARDANDO
// ============================================================

function activarEstadoGuardando() {

    if (
        !guardarAhorroButton
    ) {

        return;
    }

    guardarAhorroButton.disabled =
        true;

    guardarAhorroButton.classList.add(
        "opacity-75",
        "cursor-not-allowed"
    );

    if (
        guardarAhorroIcon
    ) {

        guardarAhorroIcon.classList.add(
            "hidden"
        );
    }

    if (
        guardarAhorroSpinner
    ) {

        guardarAhorroSpinner.classList.remove(
            "hidden"
        );
    }

    if (
        guardarAhorroText
    ) {

        guardarAhorroText.textContent =
            "Guardando...";
    }
}

// ============================================================
// ESTADO NORMAL
// ============================================================

function desactivarEstadoGuardando() {

    if (
        !guardarAhorroButton
    ) {

        return;
    }

    guardarAhorroButton.disabled =
        false;

    guardarAhorroButton.classList.remove(
        "opacity-75",
        "cursor-not-allowed"
    );

    if (
        guardarAhorroIcon
    ) {

        guardarAhorroIcon.classList.remove(
            "hidden"
        );
    }

    if (
        guardarAhorroSpinner
    ) {

        guardarAhorroSpinner.classList.add(
            "hidden"
        );
    }

    if (
        guardarAhorroText
    ) {

        guardarAhorroText.textContent =
            "Guardar ahorro";
    }
}

// ============================================================
// VALIDAR FECHA
// ============================================================

function validarFecha(
    fecha
) {

    if (!fecha) {

        mostrarError(
            fechaError,
            "La fecha es obligatoria."
        );

        return false;
    }

    const formatoCorrecto =
        /^\d{4}-\d{2}-\d{2}$/.test(
            fecha
        );

    if (
        !formatoCorrecto
    ) {

        mostrarError(
            fechaError,
            "La fecha no tiene un formato válido."
        );

        return false;
    }

    const fechaObjeto =
        new Date(
            `${fecha}T00:00:00`
        );

    if (
        Number.isNaN(
            fechaObjeto.getTime()
        )
    ) {

        mostrarError(
            fechaError,
            "La fecha ingresada no es válida."
        );

        return false;
    }

    return true;
}

// ============================================================
// VALIDAR MONTO
// ============================================================

function validarMonto(
    valor
) {

    if (!valor) {

        mostrarError(
            montoError,
            "El monto es obligatorio."
        );

        return false;
    }

    const monto =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            monto
        )
    ) {

        mostrarError(
            montoError,
            "Ingrese un monto válido."
        );

        return false;
    }

    if (
        monto <= 0
    ) {

        mostrarError(
            montoError,
            "El monto debe ser mayor que $0.00."
        );

        return false;
    }

    if (
        monto > 999999999
    ) {

        mostrarError(
            montoError,
            "El monto ingresado es demasiado alto."
        );

        return false;
    }

    return true;
}

// ============================================================
// VALIDAR CONCEPTO
// ============================================================

function validarConcepto(
    concepto
) {

    if (!concepto) {

        mostrarError(
            conceptoError,
            "El concepto es obligatorio."
        );

        return false;
    }

    if (
        concepto.length <
        1
    ) {

        mostrarError(
            conceptoError,
            "Ingrese un concepto."
        );

        return false;
    }

    if (
        concepto.length >
        100
    ) {

        mostrarError(
            conceptoError,
            "El concepto no puede superar los 100 caracteres."
        );

        return false;
    }

    return true;
}

// ============================================================
// VALIDAR FORMULARIO
// ============================================================

function validarFormulario() {

    limpiarErrores();

    const fecha =
        fechaInput?.value?.trim() ||
        "";

    const monto =
        montoInput?.value ||
        "";

    const concepto =
        conceptoInput?.value?.trim() ||
        "";

    const fechaValida =
        validarFecha(
            fecha
        );

    const montoValido =
        validarMonto(
            monto
        );

    const conceptoValido =
        validarConcepto(
            concepto
        );

    return (
        fechaValida &&
        montoValido &&
        conceptoValido
    );
}

// ============================================================
// EVENTO MONTO
// ============================================================

if (
    montoInput
) {

    montoInput.addEventListener(
        "input",
        actualizarResumenMonto
    );
}

// ============================================================
// ESTABLECER FECHA INICIAL
// ============================================================

if (
    fechaInput &&
    !fechaInput.value
) {

    fechaInput.value =
        obtenerFechaHoy();
}

// ============================================================
// ENVIAR FORMULARIO
// ============================================================

if (
    ahorroForm
) {

    ahorroForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            ocultarMensaje();

            limpiarErrores();

            // ------------------------------------------------
            // AUTENTICACIÓN
            // ------------------------------------------------

            if (
                !usuarioActual
            ) {

                mostrarMensaje(
                    "error",
                    "Sesión requerida",
                    "Debes iniciar sesión para registrar un ahorro."
                );

                return;
            }

            // ------------------------------------------------
            // VALIDACIÓN
            // ------------------------------------------------

            if (
                !validarFormulario()
            ) {

                mostrarMensaje(
                    "warning",
                    "Revisa los datos",
                    "Completa correctamente los campos obligatorios."
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER DATOS
            // ------------------------------------------------

            const fecha =
                fechaInput.value.trim();

            const monto =
                Number.parseFloat(
                    montoInput.value
                );

            const concepto =
                conceptoInput.value.trim();

            const observacion =
                observacionInput?.value?.trim() ||
                "";

            // ------------------------------------------------
            // VALIDACIÓN FINAL DEL MONTO
            // ------------------------------------------------

            if (
                !Number.isFinite(
                    monto
                ) ||
                monto <= 0
            ) {

                mostrarError(
                    montoError,
                    "Ingrese un monto válido."
                );

                return;
            }

            // ------------------------------------------------
            // ACTIVAR GUARDANDO
            // ------------------------------------------------

            activarEstadoGuardando();

            try {

                console.log(
                    "📤 Preparando ahorro..."
                );

                // =================================================
                // OBJETO A GUARDAR
                // =================================================

                const ahorroData = {

                    monto:
                        Number(
                            monto.toFixed(
                                2
                            )
                        ),

                    fecha:
                        fecha,

                    concepto:
                        concepto,

                    observacion:
                        observacion,

                    usuarioId:
                        usuarioActual.uid,

                    usuarioEmail:
                        usuarioActual.email ||
                        "",

                    fechaRegistro:
                        serverTimestamp()
                };

                console.log(
                    "📦 Datos del ahorro:",
                    ahorroData
                );

                // =================================================
                // GUARDAR FIRESTORE
                // =================================================

                const ahorroRef =
                    collection(
                        db,
                        "ahorros"
                    );

                const documento =
                    await addDoc(
                        ahorroRef,
                        ahorroData
                    );

                console.log(
                    "✅ AHORRO GUARDADO",
                    documento.id
                );

                // =================================================
                // MENSAJE ÉXITO
                // =================================================

                mostrarMensaje(
                    "success",
                    "Ahorro registrado",
                    "El ahorro se guardó correctamente en Firebase."
                );

                // =================================================
                // LIMPIAR FORMULARIO
                // =================================================

                ahorroForm.reset();

                if (
                    fechaInput
                ) {

                    fechaInput.value =
                        obtenerFechaHoy();
                }

                actualizarResumenMonto();

                // =================================================
                // REDIRECCIÓN
                // =================================================

                setTimeout(
                    () => {

                        window.location.href =
                            "ahorros.html";

                    },
                    1200
                );

            } catch (
                error
            ) {

                console.error(
                    "❌ ERROR AL GUARDAR AHORRO:",
                    error
                );

                // ------------------------------------------------
                // MENSAJE FIREBASE
                // ------------------------------------------------

                let mensaje =
                    "No fue posible guardar el ahorro.";

                if (
                    error?.code ===
                    "permission-denied"
                ) {

                    mensaje =
                        "Firebase rechazó la escritura. Verifica las reglas de Firestore de la colección 'ahorros'.";
                }

                else if (
                    error?.code ===
                    "unauthenticated"
                ) {

                    mensaje =
                        "La sesión de Firebase no es válida. Inicia sesión nuevamente.";
                }

                else if (
                    error?.code ===
                    "failed-precondition"
                ) {

                    mensaje =
                        "La operación no cumple una condición requerida por Firebase.";
                }

                else if (
                    error?.message
                ) {

                    console.error(
                        "Detalle Firebase:",
                        error.message
                    );
                }

                mostrarMensaje(
                    "error",
                    "No se pudo guardar",
                    mensaje
                );

            } finally {

                desactivarEstadoGuardando();
            }
        }
    );
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        if (
            usuario
        ) {

            usuarioActual =
                usuario;

            console.log(
                "✅ Usuario autenticado:",
                usuario.email ||
                usuario.uid
            );

            if (
                fechaInput &&
                !fechaInput.value
            ) {

                fechaInput.value =
                    obtenerFechaHoy();
            }

            actualizarResumenMonto();

            if (
                guardarAhorroButton
            ) {

                guardarAhorroButton.disabled =
                    false;
            }

        } else {

            usuarioActual =
                null;

            console.warn(
                "⚠️ Usuario no autenticado."
            );

            if (
                guardarAhorroButton
            ) {

                guardarAhorroButton.disabled =
                    true;
            }
        }
    }
);

// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            fechaInput &&
            !fechaInput.value
        ) {

            fechaInput.value =
                obtenerFechaHoy();
        }

        actualizarResumenMonto();

        console.log(
            "✅ ahorro-nuevo.js listo."
        );
    }
);