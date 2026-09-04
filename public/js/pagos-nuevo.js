import {
  collection,
  doc,
  onSnapshot,
  runTransaction
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
  getTodayInputValue,
  setText
} from "./utils.js";

// ============================================================
// COLECCIONES
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

const pagoForm =
  document.querySelector("#pagoForm");

const clienteSelect =
  document.querySelector("#clienteId");

const deudaSelect =
  document.querySelector("#deudaId");

const saldoActual =
  document.querySelector("#saldoActual");

const deudaEstado =
  document.querySelector("#deudaEstado");

const montoInput =
  document.querySelector("#monto");

const fechaInput =
  document.querySelector("#fecha");

const metodoPagoInput =
  document.querySelector("#metodoPago");

const observacionInput =
  document.querySelector("#observacion");

const savePagoButton =
  document.querySelector("#savePagoButton");

const pagoMessage =
  document.querySelector("#pagoMessage");

const saldoAnterior =
  document.querySelector("#saldoAnterior");

const pagoPreview =
  document.querySelector("#pagoPreview");

const nuevoSaldo =
  document.querySelector("#nuevoSaldo");

const nuevoEstado =
  document.querySelector("#nuevoEstado");

const montoAyuda =
  document.querySelector("#montoAyuda");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];

let clientesUnsubscribe = null;
let deudasUnsubscribe = null;

let deudaSeleccionada = null;

// ============================================================
// FECHA
// ============================================================

if (fechaInput) {
  fechaInput.value =
    getTodayInputValue();
}

// ============================================================
// UTILIDADES
// ============================================================

function getSaldoDeuda(deuda) {

  if (!deuda) {
    return 0;
  }

  const saldo =
    Number(deuda.saldo);

  if (
    Number.isFinite(saldo)
  ) {
    return Math.max(
      saldo,
      0
    );
  }

  const monto =
    Number(
      deuda.monto || 0
    );

  const pagado =
    Number(
      deuda.montoPagado || 0
    );

  return Math.max(
    monto - pagado,
    0
  );
}

function getTodayKey() {
  return getTodayInputValue();
}

function getDebtStatusAfterPayment(
  saldo,
  fechaVencimiento
) {

  // Deuda pagada
  if (
    saldo <= 0.009
  ) {
    return "PAGADA";
  }

  // Fecha actual
  const today =
    getTodayKey();

  // Deuda vencida
  if (
    fechaVencimiento &&
    fechaVencimiento < today
  ) {
    return "VENCIDA";
  }

  return "PENDIENTE";
}

function formatDateForMessage(
  dateString
) {

  if (!dateString) {
    return "—";
  }

  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(date);
}

// ============================================================
// MENSAJES
// ============================================================

function showMessage(
  message,
  type = "error"
) {

  if (!pagoMessage) {
    return;
  }

  if (!message) {

    pagoMessage.textContent =
      "";

    pagoMessage.className =
      "mt-3 min-h-5 rounded-xl px-4 py-3 text-sm font-semibold";

    return;
  }

  pagoMessage.textContent =
    message;

  pagoMessage.className =
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
      "Firestore rechazó la operación. Verifica las reglas de Firestore.",

    unauthenticated:
      "Tu sesión no está activa. Vuelve a iniciar sesión.",

    unavailable:
      "Firestore no está disponible en este momento. Intenta nuevamente.",

    "not-found":
      "La deuda seleccionada ya no existe.",

    "invalid-payment":
      "El pago supera el saldo pendiente.",

    "failed-precondition":
      "No se pudo completar la operación. Verifica la configuración de Firestore."
  };

  return (
    messages[
      error?.code
    ] ||
    `No se pudo registrar el pago. ${
      error?.message ||
      "Error desconocido."
    }`
  );
}

// ============================================================
// ESTADO DEL BOTÓN
// ============================================================

function setSavingState(
  saving
) {

  if (!savePagoButton) {
    return;
  }

  if (saving) {

    if (
      !savePagoButton.dataset
        .originalHtml
    ) {
      savePagoButton.dataset.originalHtml =
        savePagoButton.innerHTML;
    }

    savePagoButton.disabled =
      true;

    savePagoButton.classList.add(
      "cursor-not-allowed",
      "opacity-70"
    );

    savePagoButton.innerHTML = `
      <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
      Registrando...
    `;

    return;
  }

  savePagoButton.disabled =
    !deudaSeleccionada;

  savePagoButton.classList.remove(
    "cursor-not-allowed",
    "opacity-70"
  );

  if (
    savePagoButton.dataset
      .originalHtml
  ) {

    savePagoButton.innerHTML =
      savePagoButton.dataset
        .originalHtml;

    delete savePagoButton
      .dataset
      .originalHtml;
  }
}

// ============================================================
// CLIENTES
// ============================================================

function renderClientes() {

  if (!clienteSelect) {
    return;
  }

  clienteSelect.innerHTML =
    "";

  const activeClientes =
    clientes.filter(
      (cliente) =>
        cliente.activo !== false
    );

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value =
    "";

  placeholder.textContent =
    activeClientes.length
      ? "Selecciona un cliente"
      : "No hay clientes activos";

  clienteSelect.appendChild(
    placeholder
  );

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
    activeClientes.length === 0;

  if (
    activeClientes.length === 0
  ) {

    resetDebtSelection(
      "No hay clientes activos"
    );
  }
}

// ============================================================
// DEUDAS DEL CLIENTE
// ============================================================

function getClientPendingDebts(
  clienteId
) {

  return deudas
    .filter(
      (deuda) =>
        deuda.clienteId ===
          clienteId &&
        getSaldoDeuda(
          deuda
        ) > 0.009
    )
    .sort(
      (a, b) =>
        String(
          a.fechaVencimiento || ""
        ).localeCompare(
          String(
            b.fechaVencimiento || ""
          )
        )
    );
}

function renderDeudasForClient(
  clienteId
) {

  if (!deudaSelect) {
    return;
  }

  deudaSelect.innerHTML =
    "";

  const pendientes =
    getClientPendingDebts(
      clienteId
    );

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value =
    "";

  if (!clienteId) {

    placeholder.textContent =
      "Selecciona un cliente primero";

    deudaSelect.disabled =
      true;

  } else if (
    pendientes.length === 0
  ) {

    placeholder.textContent =
      "Este cliente no tiene deudas pendientes";

    deudaSelect.disabled =
      true;

  } else {

    placeholder.textContent =
      "Selecciona una deuda";

    deudaSelect.disabled =
      false;
  }

  deudaSelect.appendChild(
    placeholder
  );

  pendientes.forEach(
    (deuda) => {

      const option =
        document.createElement(
          "option"
        );

      const saldo =
        getSaldoDeuda(
          deuda
        );

      const vencimiento =
        deuda.fechaVencimiento
          ? ` · vence ${formatDateForMessage(
              deuda.fechaVencimiento
            )}`
          : "";

      option.value =
        deuda.id;

      option.textContent =
        `${deuda.concepto || "Deuda"} · saldo ${formatCurrency(
          saldo
        )}${vencimiento}`;

      deudaSelect.appendChild(
        option
      );
    }
  );

  resetDebtPreview();
}

// ============================================================
// SELECCIONAR DEUDA
// ============================================================

function selectDebt(
  deudaId
) {

  deudaSeleccionada =
    deudas.find(
      (deuda) =>
        deuda.id ===
        deudaId
    ) || null;

  if (!deudaSeleccionada) {

    resetDebtPreview();
    return;
  }

  const saldo =
    getSaldoDeuda(
      deudaSeleccionada
    );

  setText(
    saldoActual,
    formatCurrency(
      saldo
    )
  );

  setText(
    saldoAnterior,
    formatCurrency(
      saldo
    )
  );

  setText(
    deudaEstado,
    deudaSeleccionada.fechaVencimiento
      ? `Vencimiento: ${formatDateForMessage(
          deudaSeleccionada.fechaVencimiento
        )}`
      : "Deuda pendiente"
  );

  if (montoInput) {
    montoInput.max =
      saldo.toFixed(2);
  }

  if (montoAyuda) {

    montoAyuda.textContent =
      `Saldo máximo disponible: ${formatCurrency(
        saldo
      )}`;
  }

  if (savePagoButton) {
    savePagoButton.disabled =
      saldo <= 0.009;
  }

  updatePreview();
}

// ============================================================
// REINICIAR PREVISUALIZACIÓN
// ============================================================

function resetDebtPreview() {

  deudaSeleccionada =
    null;

  setText(
    saldoActual,
    "$0.00"
  );

  setText(
    saldoAnterior,
    "$0.00"
  );

  setText(
    pagoPreview,
    "$0.00"
  );

  setText(
    nuevoSaldo,
    "$0.00"
  );

  setText(
    nuevoEstado,
    "Pendiente de seleccionar"
  );

  setText(
    deudaEstado,
    "Selecciona una deuda"
  );

  if (montoInput) {

    montoInput.removeAttribute(
      "max"
    );
  }

  if (montoAyuda) {

    montoAyuda.textContent =
      "No puedes superar el saldo pendiente.";
  }

  if (savePagoButton) {

    savePagoButton.disabled =
      true;
  }
}

function resetDebtSelection(
  message
) {

  if (deudaSelect) {

    deudaSelect.innerHTML =
      `<option value="">${message}</option>`;

    deudaSelect.disabled =
      true;
  }

  resetDebtPreview();
}

// ============================================================
// PREVISUALIZACIÓN
// ============================================================

function updatePreview() {

  const saldo =
    getSaldoDeuda(
      deudaSeleccionada
    );

  const monto =
    Number(
      montoInput?.value || 0
    );

  const pagoValido =
    Number.isFinite(
      monto
    ) &&
    monto > 0;

  const saldoNuevo =
    pagoValido
      ? Math.max(
          saldo - monto,
          0
        )
      : saldo;

  const estado =
    deudaSeleccionada
      ? getDebtStatusAfterPayment(
          saldoNuevo,
          deudaSeleccionada.fechaVencimiento
        )
      : "—";

  setText(
    pagoPreview,
    formatCurrency(
      pagoValido
        ? monto
        : 0
    )
  );

  setText(
    nuevoSaldo,
    formatCurrency(
      saldoNuevo
    )
  );

  setText(
    nuevoEstado,
    deudaSeleccionada
      ? `Estado después del pago: ${estado}`
      : "Pendiente de seleccionar"
  );
}

// ============================================================
// DATOS DEL FORMULARIO
// ============================================================

function getFormData() {

  return {

    clienteId:
      String(
        clienteSelect?.value ||
          ""
      ).trim(),

    deudaId:
      String(
        deudaSelect?.value ||
          ""
      ).trim(),

    monto:
      Number(
        montoInput?.value
      ),

    fecha:
      String(
        fechaInput?.value ||
          ""
      ).trim(),

    metodoPago:
      String(
        metodoPagoInput?.value ||
          ""
      ).trim(),

    observacion:
      String(
        observacionInput?.value ||
          ""
      ).trim()
  };
}

// ============================================================
// VALIDACIÓN
// ============================================================

function validateForm(
  data
) {

  if (!data.clienteId) {

    return "Selecciona un cliente.";
  }

  if (!data.deudaId) {

    return "Selecciona una deuda pendiente.";
  }

  if (
    !Number.isFinite(
      data.monto
    ) ||
    data.monto <= 0
  ) {

    return "Ingresa un monto mayor a cero.";
  }

  if (!data.fecha) {

    return "Selecciona la fecha del pago.";
  }

  if (
    data.fecha >
    getTodayKey()
  ) {

    return "La fecha del pago no puede ser futura.";
  }

  if (!data.metodoPago) {

    return "Selecciona un método de pago.";
  }

  const deuda =
    deudas.find(
      (item) =>
        item.id ===
        data.deudaId
    );

  if (!deuda) {

    return "La deuda seleccionada ya no está disponible.";
  }

  const saldo =
    getSaldoDeuda(
      deuda
    );

  if (
    data.monto >
    saldo + 0.009
  ) {

    return `El pago no puede superar el saldo de ${formatCurrency(
      saldo
    )}.`;
  }

  return "";
}

// ============================================================
// REGISTRAR PAGO
// ============================================================

pagoForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const data =
      getFormData();

    const validation =
      validateForm(
        data
      );

    if (validation) {

      showMessage(
        validation
      );

      return;
    }

    setSavingState(
      true
    );

    showMessage(
      "Registrando pago...",
      "success"
    );

    try {

      const deudaRef =
        doc(
          db,
          "deudas",
          data.deudaId
        );

      const pagoRef =
        doc(
          pagosCollection
        );

      await runTransaction(
        db,
        async (transaction) => {

          // ================================================
          // OBTENER DEUDA ACTUAL
          // ================================================

          const deudaSnapshot =
            await transaction.get(
              deudaRef
            );

          if (
            !deudaSnapshot.exists()
          ) {

            throw Object.assign(
              new Error(
                "La deuda ya no existe."
              ),
              {
                code:
                  "not-found"
              }
            );
          }

          const deudaActual =
            deudaSnapshot.data();

          const saldoAnteriorActual =
            getSaldoDeuda(
              deudaActual
            );

          // ================================================
          // VALIDAR MONTO
          // ================================================

          if (
            data.monto >
            saldoAnteriorActual +
              0.009
          ) {

            throw Object.assign(
              new Error(
                "El pago supera el saldo disponible."
              ),
              {
                code:
                  "invalid-payment"
              }
            );
          }

          // ================================================
          // NUEVOS VALORES
          // ================================================

          const montoPagadoActual =
            Number(
              deudaActual.montoPagado ||
                0
            );

          const nuevoMontoPagado =
            Number(
              (
                montoPagadoActual +
                data.monto
              ).toFixed(2)
            );

          const nuevoSaldoValue =
            Number(
              (
                saldoAnteriorActual -
                data.monto
              ).toFixed(2)
            );

          const nuevoEstado =
            getDebtStatusAfterPayment(
              nuevoSaldoValue,
              deudaActual.fechaVencimiento
            );

          // ================================================
          // ACTUALIZAR DEUDA
          // IMPORTANTE:
          // SOLO campos permitidos por Firestore
          // ================================================

          transaction.update(
            deudaRef,
            {

              montoPagado:
                nuevoMontoPagado,

              saldo:
                nuevoSaldoValue,

              estado:
                nuevoEstado
            }
          );

          // ================================================
          // CREAR PAGO
          // IMPORTANTE:
          // SOLO campos permitidos por Firestore
          // ================================================

          transaction.set(
            pagoRef,
            {

              clienteId:
                data.clienteId,

              deudaId:
                data.deudaId,

              monto:
                Number(
                  data.monto.toFixed(2)
                ),

              fecha:
                data.fecha,

              metodoPago:
                data.metodoPago,

              observacion:
                data.observacion
            }
          );

        }
      );

      // ================================================
      // ÉXITO
      // ================================================

      showMessage(
        "Pago registrado correctamente. Redirigiendo al historial...",
        "success"
      );

      setTimeout(
        () => {

          window.location.href =
            "pagos.html";

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
// EVENTOS
// ============================================================

clienteSelect?.addEventListener(
  "change",
  (event) => {

    renderDeudasForClient(
      event.target.value
    );
  }
);

deudaSelect?.addEventListener(
  "change",
  (event) => {

    selectDebt(
      event.target.value
    );
  }
);

montoInput?.addEventListener(
  "input",
  () => {

    updatePreview();
  }
);

// ============================================================
// LISTENERS FIRESTORE
// ============================================================

function startListeners() {

  clientesUnsubscribe?.();
  deudasUnsubscribe?.();

  // ========================================================
  // CLIENTES
  // ========================================================

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

        renderClientes();
      },

      (error) => {

        console.error(
          "Error al cargar clientes:",
          error
        );

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

        if (savePagoButton) {

          savePagoButton.disabled =
            true;
        }

        showMessage(
          "No se pudieron cargar los clientes. Revisa los permisos de Firestore."
        );
      }
    );

  // ========================================================
  // DEUDAS
  // ========================================================

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

        const clienteId =
          clienteSelect?.value ||
          "";

        if (clienteId) {

          renderDeudasForClient(
            clienteId
          );
        }
      },

      (error) => {

        console.error(
          "Error al cargar deudas:",
          error
        );

        resetDebtSelection(
          "No se pudieron cargar las deudas"
        );

        showMessage(
          "No se pudieron cargar las deudas. Revisa los permisos de Firestore."
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