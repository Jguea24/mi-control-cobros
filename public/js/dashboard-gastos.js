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

function formatMoney(value) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

onAuthStateChanged(auth, (user) => {

  const totalElement =
    document.getElementById("dashboardTotalGastado");

  const detailElement =
    document.getElementById("dashboardGastadoDetalle");

  if (!totalElement || !detailElement) {
    return;
  }

  if (!user) {
    totalElement.textContent = "$0,00";
    detailElement.textContent = "0 gastos registrados";
    return;
  }

  const gastosQuery = query(
    collection(db, "gastos"),
    where("usuarioId", "==", user.uid)
  );

  onSnapshot(
    gastosQuery,
    (snapshot) => {

      let totalGastado = 0;

      snapshot.forEach((doc) => {

        const gasto = doc.data() || {};
        const monto = Number(gasto.monto);

        if (Number.isFinite(monto)) {
          totalGastado += monto;
        }

      });

      totalElement.textContent =
        formatMoney(totalGastado);

      const cantidad = snapshot.size;

      detailElement.textContent =
        `${cantidad} ${
          cantidad === 1
            ? "gasto registrado"
            : "gastos registrados"
        }`;

    },
    (error) => {

      console.error(
        "Error al cargar gastos del dashboard:",
        error
      );

      totalElement.textContent = "$0,00";
      detailElement.textContent =
        "Error al cargar gastos";

    }
  );

});