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
  document.getElementById("pagoForm");

const clienteSelect =
  document.getElementById("clienteId");

const deudaSelect =
  document.getElementById("deudaId");

const saldoActual =
  document.getElementById("saldoActual");

const deudaEstado =
  document.getElementById("deudaEstado");

const montoInput =
  document.getElementById("monto");

const fechaInput =
  document.getElementById("fecha");

const metodoPagoInput =
  document.getElementById("metodoPago");

const observacionInput =
  document.getElementById("observacion");

const savePagoButton =
  document.getElementById("savePagoButton");

const pagoMessage =
  document.getElementById("pagoMessage");

const saldoAnterior =
  document.getElementById("saldoAnterior");

const pagoPreview =
  document.getElementById("pagoPreview");

const nuevoSaldo =
  document.getElementById("nuevoSaldo");

const nuevoEstado =
  document.getElementById("nuevoEstado");

const montoAyuda =
  document.getElementById("montoAyuda");

// ============================================================
// ESTADO
// ============================================================

let clientes = [];
let deudas = [];

let clientesUnsubscribe = null;
let deudasUnsubscribe = null;

let deudaSeleccionada = null;

// ============================================================
// FECHA INICIAL
// ============================================================

if (fechaInput) {
  fechaInput.value =
    getTodayInputValue();
}

// ============================================================
// SALDO DE LA DEUDA
// ============================================================

function getSaldoDeuda(deuda) {

  if (!deuda) {
    return 0;
  }

  const saldo =
    Number(deuda.saldo);

  if (Number.isFinite(saldo)) {

    return Math.max(
      Number(
        saldo.toFixed(2)
      ),
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
    Number(
      (
        monto - pagado
      ).toFixed(2)
    ),
    0
  );
}

// ============================================================
// FECHA ACTUAL
// ============================================================

function getTodayKey() {

  return getTodayInputValue();
}

// ============================================================
// ESTADO DESPUÉS DEL PAGO
// ============================================================

function getDebtStatusAfterPayment(
  saldo,
  fechaVencimiento
) {

  // ==========================================================
  // DEUDA COMPLETAMENTE PAGADA
  // ==========================================================

  if (saldo <= 0.009) {

    return "PAGADO";
  }

  // ==========================================================
  // FECHA ACTUAL
  // ==========================================================

  const today =
    getTodayKey();

  // ==========================================================
  // DEUDA VENCIDA
  // ==========================================================

  if (
    fechaVencimiento &&
    fechaVencimiento < today
  ) {

    return "VENCIDA";
  }

  // ==========================================================
  // DEUDA PENDIENTE
  // ==========================================================

  return "PENDIENTE";
}

// ============================================================
// FECHA PARA MOSTRAR
// ============================================================

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
// MENSAJE DE ERROR FIRESTORE
// ============================================================

function getFirestoreErrorMessage(
  error
) {

  console.error(
    "❌ Error Firestore:",
    error
  );

  if (
    error?.code ===
    "permission-denied"
  ) {

    return (
      "Firestore rechazó la operación. " +
      "Verifica las reglas y que pagos-nuevo.js " +
      "esté actualizado."
    );
  }

  if (
    error?.code ===
    "invalid-payment"
  ) {

    return (
      "El pago no puede superar el saldo pendiente."
    );
  }

  if (
    error?.code ===
    "not-found"
  ) {

    return (
      "La deuda seleccionada ya no existe."
    );
  }

  if (
    error?.code ===
    "unauthenticated"
  ) {

    return (
      "Tu sesión no está activa. Inicia sesión nuevamente."
    );
  }

  return (
    error?.message ||
    "No se pudo registrar el pago."
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
      <span
        class="inline-flex h-5 w-5 animate-spin
               rounded-full border-2 border-white/40
               border-t-white">
      </span>
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

  const activos =
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
    activos.length
      ? "Selecciona un cliente"
      : "No hay clientes activos";

  clienteSelect.appendChild(
    placeholder
  );

  activos.forEach(
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
    activos.length === 0;

  if (!activos.length) {

    resetDebtSelection(
      "No hay clientes activos"
    );
  }
}

// ============================================================
// DEUDAS PENDIENTES
// ============================================================

function getClientPendingDebts(
  clienteId
) {

  return deudas
    .filter(
      (deuda) => {

        const mismoCliente =
          deuda.clienteId ===
          clienteId;

        const saldo =
          getSaldoDeuda(
            deuda
          );

        return (
          mismoCliente &&
          saldo > 0.009
        );
      }
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

// ============================================================
// CARGAR DEUDAS DEL CLIENTE
// ============================================================

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
// RESET
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
          Number(
            (
              saldo -
              monto
            ).toFixed(2)
          ),
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

  if (
    deuda.clienteId !==
    data.clienteId
  ) {

    return "La deuda no pertenece al cliente seleccionado.";
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

    showMessage("");

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

      // ======================================================
      // REFERENCIA DE LA DEUDA
      // ======================================================

      const deudaRef =
        doc(
          db,
          "deudas",
          data.deudaId
        );

      // ======================================================
      // REFERENCIA DEL NUEVO PAGO
      // ======================================================

      const pagoRef =
        doc(
          pagosCollection
        );

      // ======================================================
      // TRANSACCIÓN ATÓMICA
      // ======================================================

      await runTransaction(
        db,
        async (transaction) => {

          // --------------------------------------------------
          // LEER LA DEUDA MÁS RECIENTE
          // --------------------------------------------------

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

          // --------------------------------------------------
          // VALIDAR CLIENTE
          // --------------------------------------------------

          if (
            deudaActual.clienteId !==
            data.clienteId
          ) {

            throw Object.assign(
              new Error(
                "La deuda no pertenece al cliente seleccionado."
              ),
              {
                code:
                  "invalid-payment"
              }
            );
          }

          // --------------------------------------------------
          // OBTENER SALDO REAL
          // --------------------------------------------------

          const saldoAnteriorReal =
            getSaldoDeuda(
              deudaActual
            );

          // --------------------------------------------------
          // VALIDAR MONTO CONTRA FIRESTORE
          // --------------------------------------------------

          if (
            data.monto >
            saldoAnteriorReal +
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

          // --------------------------------------------------
          // MONTO PAGADO ANTERIOR
          // --------------------------------------------------

          const montoPagadoAnterior =
            Number(
              deudaActual.montoPagado ||
              0
            );

          // --------------------------------------------------
          // NUEVO MONTO PAGADO
          // --------------------------------------------------

          const nuevoMontoPagado =
            Number(
              (
                montoPagadoAnterior +
                data.monto
              ).toFixed(2)
            );

          // --------------------------------------------------
          // NUEVO SALDO
          // --------------------------------------------------

          const nuevoSaldo =
            Number(
              (
                saldoAnteriorReal -
                data.monto
              ).toFixed(2)
            );

          // --------------------------------------------------
          // NUEVO ESTADO
          // --------------------------------------------------

          const nuevoEstado =
            getDebtStatusAfterPayment(
              nuevoSaldo,
              deudaActual.fechaVencimiento
            );

          // --------------------------------------------------
          // ACTUALIZAR DEUDA
          // --------------------------------------------------

          transaction.update(
            deudaRef,
            {
              montoPagado:
                nuevoMontoPagado,

              saldo:
                nuevoSaldo,

              estado:
                nuevoEstado
            }
          );

          // --------------------------------------------------
          // REGISTRAR PAGO
          // --------------------------------------------------

          transaction.set(
            pagoRef,
            {
              deudaId:
                data.deudaId,

              clienteId:
                data.clienteId,

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

      // ======================================================
      // ÉXITO
      // ======================================================

      showMessage(
        "Pago registrado correctamente.",
        "success"
      );

      setTimeout(
        () => {

          window.location.href =
            "pagos.html";

        },
        800
      );

    } catch (error) {

      console.error(
        "❌ No se pudo registrar el pago:",
        error
      );

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

  // ==========================================================
  // CLIENTES
  // ==========================================================

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
          "❌ Error clientes:",
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

        showMessage(
          "No se pudieron cargar los clientes."
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
          "❌ Error deudas:",
          error
        );

        resetDebtSelection(
          "No se pudieron cargar las deudas"
        );

        showMessage(
          "No se pudieron cargar las deudas."
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

      window.location.href =
        "login.html";

      return;
    }

    startListeners();
  }
);