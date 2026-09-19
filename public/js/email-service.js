/**
 * =========================================================
 * SERVICIO DE CORREO
 * MI CONTROL DE COBROS
 * =========================================================
 *
 * Utiliza EmailJS para enviar el comprobante de pago
 * al correo electrónico del cliente.
 * =========================================================
 */

// =========================================================
// CONFIGURACIÓN EMAILJS
// =========================================================

const EMAILJS_PUBLIC_KEY = "Q545jvonezOTZYyTy";

const EMAILJS_SERVICE_ID = "service_12c09wr";

const EMAILJS_TEMPLATE_ID = "template_l7vrv0v";

// =========================================================
// CARGAR EMAILJS
// =========================================================

let emailJsPromise = null;

function loadEmailJS() {

  // Si EmailJS ya está cargado
  if (window.emailjs) {
    return Promise.resolve(window.emailjs);
  }

  // Si ya existe una carga en proceso
  if (emailJsPromise) {
    return emailJsPromise;
  }

  emailJsPromise =
    new Promise((resolve, reject) => {

      // Buscar si el script ya existe
      const existingScript =
        document.querySelector(
          'script[data-emailjs="true"]'
        );

      // -----------------------------------------------------
      // SCRIPT YA EXISTENTE
      // -----------------------------------------------------

      if (existingScript) {

        existingScript.addEventListener(
          "load",
          () => {

            if (window.emailjs) {

              resolve(
                window.emailjs
              );

            } else {

              reject(
                new Error(
                  "EmailJS no pudo inicializarse."
                )
              );

            }

          }
        );

        existingScript.addEventListener(
          "error",
          () => {

            reject(
              new Error(
                "No se pudo cargar EmailJS."
              )
            );

          }
        );

        return;
      }

      // -----------------------------------------------------
      // CREAR SCRIPT
      // -----------------------------------------------------

      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

      script.async = true;

      script.dataset.emailjs =
        "true";

      // -----------------------------------------------------
      // CARGA EXITOSA
      // -----------------------------------------------------

      script.onload = () => {

        if (!window.emailjs) {

          reject(
            new Error(
              "EmailJS se cargó, pero no está disponible."
            )
          );

          return;
        }

        resolve(
          window.emailjs
        );

      };

      // -----------------------------------------------------
      // ERROR
      // -----------------------------------------------------

      script.onerror = () => {

        reject(
          new Error(
            "No se pudo cargar el servicio de correo EmailJS."
          )
        );

      };

      document.head.appendChild(
        script
      );

    });

  return emailJsPromise;
}

// =========================================================
// UTILIDADES
// =========================================================

function money(value) {

  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return amount;
}

// =========================================================
// FORMATEAR DINERO
// =========================================================

function formatMoney(value) {

  return new Intl.NumberFormat(
    "es-EC",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }
  ).format(
    money(value)
  );
}

// =========================================================
// LIMPIAR TEXTO
// =========================================================

function safeText(
  value,
  fallback = "—"
) {

  const text =
    String(
      value ?? ""
    ).trim();

  return text || fallback;
}

// =========================================================
// FORMATEAR FECHA
// =========================================================

function formatDate(
  dateString
) {

  if (!dateString) {
    return "—";
  }

  /*
   * La aplicación trabaja con fechas
   * en formato YYYY-MM-DD.
   *
   * Ejemplo:
   * 2026-09-08
   *
   * Resultado:
   * 08/09/2026
   */

  const cleanDate =
    String(
      dateString
    ).trim();

  // Validar formato YYYY-MM-DD
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(cleanDate);

  if (!match) {

    return cleanDate;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  // Crear fecha en hora local
  const date =
    new Date(
      year,
      month - 1,
      day
    );

  // Validar que la fecha realmente exista
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return cleanDate;
  }

  // Validación adicional
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {

    return cleanDate;
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(
    date
  );
}

// =========================================================
// VALIDAR CORREO
// =========================================================

function isValidEmail(
  email
) {

  const value =
    String(
      email ?? ""
    ).trim();

  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(value);
}

// =========================================================
// CREAR DATOS DEL COMPROBANTE
// =========================================================

function buildPaymentData(
  datos
) {

  const monto =
    money(
      datos.monto
    );

  const saldoAnterior =
    money(
      datos.saldoAnterior
    );

  const saldoActual =
    money(
      datos.saldoActual
    );

  const cliente =
    safeText(
      datos.cliente,
      "Cliente"
    );

  const concepto =
    safeText(
      datos.concepto,
      "Pago de deuda"
    );

  const fechaOriginal =
    safeText(
      datos.fecha,
      ""
    );

  const fecha =
    formatDate(
      fechaOriginal
    );

  const metodoPago =
    safeText(
      datos.metodoPago,
      "No especificado"
    );

  const estado =
    safeText(
      datos.estado,
      "PAGO REGISTRADO"
    );

  const observacion =
    safeText(
      datos.observacion,
      ""
    );

  return {

    email:
      String(
        datos.email ?? ""
      ).trim(),

    cliente,

    concepto,

    monto,

    montoFormateado:
      formatMoney(
        monto
      ),

    fecha,

    fechaOriginal,

    metodoPago,

    saldoAnterior,

    saldoAnteriorFormateado:
      formatMoney(
        saldoAnterior
      ),

    saldoActual,

    saldoActualFormateado:
      formatMoney(
        saldoActual
      ),

    estado,

    observacion

  };

}

// =========================================================
// ENVIAR COMPROBANTE
// =========================================================

export async function enviarComprobantePago(
  datos
) {

  // -------------------------------------------------------
  // VALIDAR DATOS
  // -------------------------------------------------------

  if (!datos) {

    throw new Error(
      "No se recibieron los datos del pago."
    );

  }

  // -------------------------------------------------------
  // PREPARAR DATOS
  // -------------------------------------------------------

  const payment =
    buildPaymentData(
      datos
    );

  // -------------------------------------------------------
  // VALIDAR CORREO
  // -------------------------------------------------------

  if (
    !isValidEmail(
      payment.email
    )
  ) {

    throw new Error(
      "El cliente no tiene un correo electrónico válido."
    );

  }

  // -------------------------------------------------------
  // VALIDAR CONFIGURACIÓN
  // -------------------------------------------------------

  if (
    EMAILJS_PUBLIC_KEY ===
    "TU_PUBLIC_KEY"
  ) {

    throw new Error(
      "Debes configurar EMAILJS_PUBLIC_KEY."
    );

  }

  if (
    EMAILJS_SERVICE_ID ===
    "TU_SERVICE_ID"
  ) {

    throw new Error(
      "Debes configurar EMAILJS_SERVICE_ID."
    );

  }

  if (
    EMAILJS_TEMPLATE_ID ===
    "TU_TEMPLATE_ID"
  ) {

    throw new Error(
      "Debes configurar EMAILJS_TEMPLATE_ID."
    );

  }

  // -------------------------------------------------------
  // CARGAR EMAILJS
  // -------------------------------------------------------

  const emailjs =
    await loadEmailJS();

  // -------------------------------------------------------
  // INICIALIZAR EMAILJS
  // -------------------------------------------------------

  emailjs.init({
    publicKey:
      EMAILJS_PUBLIC_KEY
  });

  // -------------------------------------------------------
  // DATOS PARA LA PLANTILLA
  // -------------------------------------------------------

  const templateParams = {

    // =====================================================
    // DESTINATARIO
    // =====================================================

    to_email:
      payment.email,

    // =====================================================
    // DATOS PRINCIPALES
    // =====================================================

    cliente:
      payment.cliente,

    concepto:
      payment.concepto,

    monto:
      payment.montoFormateado,

    monto_numero:
      payment.monto.toFixed(2),

    fecha:
      payment.fecha,

    fecha_iso:
      payment.fechaOriginal,

    metodo_pago:
      payment.metodoPago,

    saldo_anterior:
      payment.saldoAnteriorFormateado,

    saldo_anterior_numero:
      payment.saldoAnterior.toFixed(2),

    saldo_actual:
      payment.saldoActualFormateado,

    saldo_actual_numero:
      payment.saldoActual.toFixed(2),

    estado:
      payment.estado,

    observacion:
      payment.observacion,

    // =====================================================
    // DATOS ADICIONALES
    // =====================================================

    empresa:
      "Mi Control de Cobros",

    titulo:
      "✅ Pago exitoso",

    asunto:
      "✅ Pago exitoso - Mi Control de Cobros",

    mensaje:
      "Hemos recibido correctamente tu pago.",

    // =====================================================
    // COMPROBANTE EN TEXTO
    // =====================================================

    comprobante:
      [
        "================================",
        "      MI CONTROL DE COBROS",
        "       COMPROBANTE DE PAGO",
        "================================",
        "",
        `Cliente: ${payment.cliente}`,
        `Concepto: ${payment.concepto}`,
        `Fecha: ${payment.fecha}`,
        `Método de pago: ${payment.metodoPago}`,
        "",
        `Saldo anterior: ${payment.saldoAnteriorFormateado}`,
        `Pago realizado: ${payment.montoFormateado}`,
        `Saldo actual: ${payment.saldoActualFormateado}`,
        "",
        `Estado: ${payment.estado}`,

        payment.observacion
          ? `Observación: ${payment.observacion}`
          : "",

        "",
        "Gracias por realizar tu pago.",
        "",
        "Mi Control de Cobros"
      ]
        .filter(Boolean)
        .join("\n")

  };

  // -------------------------------------------------------
  // MOSTRAR DATOS EN CONSOLA
  // -------------------------------------------------------

  console.log(
    "📧 Preparando envío de comprobante:",
    {
      destinatario:
        templateParams.to_email,

      cliente:
        templateParams.cliente,

      monto:
        templateParams.monto,

      fecha:
        templateParams.fecha,

      metodoPago:
        templateParams.metodo_pago,

      saldoAnterior:
        templateParams.saldo_anterior,

      saldoActual:
        templateParams.saldo_actual,

      estado:
        templateParams.estado
    }
  );

  // -------------------------------------------------------
  // ENVIAR
  // -------------------------------------------------------

  try {

    const response =
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

    console.log(
      "✅ Correo enviado correctamente:",
      response.status,
      response.text
    );

    return {

      success:
        true,

      status:
        response.status,

      text:
        response.text,

      email:
        payment.email

    };

  } catch (error) {

    console.error(
      "❌ Error enviando correo con EmailJS:",
      error
    );

    throw new Error(
      "No se pudo enviar el comprobante por correo."
    );

  }

}

// =========================================================
// EXPORTACIONES OPCIONALES
// =========================================================

export {

  formatMoney,

  formatDate,

  isValidEmail

};