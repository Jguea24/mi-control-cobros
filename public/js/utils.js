export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(amount);
}

export function getTodayInputValue() {
  const today = new Date();

  const offsetDate = new Date(
    today.getTime() -
    today.getTimezoneOffset() * 60000
  );

  return offsetDate
    .toISOString()
    .slice(0, 10);
}

export function getDebtStatus(deuda) {
  if (deuda?.estado === "ANULADA") {
    return "ANULADA";
  }

  const saldo =
    Number(deuda.saldo || 0);

  // DEUDA PAGADA
  if (saldo <= 0.009) {
    return "PAGADO";
  }

  // DEUDA VENCIDA
  if (deuda.fechaVencimiento) {
    const today =
      getTodayInputValue();

    if (
      deuda.fechaVencimiento <
      today
    ) {
      return "VENCIDA";
    }
  }

  // DEUDA PENDIENTE
  return "PENDIENTE";
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function setText(element, value) {
  if (element) {
    element.textContent =
      value;
  }
}
