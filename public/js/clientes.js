import {
  collection,
  doc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import { normalizeText, setText } from "./utils.js";

const clientesCollection = collection(db, "clientes");

// ============================================================
// ELEMENTOS DE LA PÁGINA clientes.html
// ============================================================

const clientesTableBody = document.querySelector("#clientesTableBody");
const clientesCount = document.querySelector("#clientesCount");
const buscarCliente = document.querySelector("#buscarCliente");
const tablaResumen = document.querySelector("#tablaResumen");

// ============================================================
// VARIABLES
// ============================================================

let clientes = [];
let filtroActual = "";
let clientesUnsubscribe = null;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function getFechaTimestamp(fecha) {
  if (!fecha) return 0;

  // Firebase Timestamp
  if (typeof fecha.toMillis === "function") {
    return fecha.toMillis();
  }

  // Date
  if (fecha instanceof Date) {
    return fecha.getTime();
  }

  // Número
  if (typeof fecha === "number") {
    return fecha;
  }

  // String
  if (typeof fecha === "string") {
    const parsed = new Date(fecha).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function formatFecha(fecha) {
  const timestamp = getFechaTimestamp(fecha);

  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

// ============================================================
// FILTRAR CLIENTES
// ============================================================

function getFilteredClientes() {
  const filtro = normalizeText(filtroActual);

  if (!filtro) {
    return clientes;
  }

  return clientes.filter((cliente) => {
    const texto = normalizeText(
      [
        cliente.nombre,
        cliente.empresa,
        cliente.ruc,
        cliente.telefono,
        cliente.correo,
        cliente.direccion,
        cliente.notas
      ].join(" ")
    );

    return texto.includes(filtro);
  });
}

// ============================================================
// CREAR BOTÓN
// ============================================================

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = label;

  button.addEventListener("click", onClick);

  return button;
}

// ============================================================
// DESACTIVAR CLIENTE
// ============================================================

async function desactivarCliente(cliente) {
  if (!cliente?.id) {
    return;
  }

  if (cliente.activo === false) {
    return;
  }

  const confirmar = window.confirm(
    `¿Está seguro de desactivar al cliente "${cliente.nombre || "seleccionado"}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await updateDoc(doc(db, "clientes", cliente.id), {
      activo: false
    });

    console.log(
      `Cliente ${cliente.id} desactivado correctamente.`
    );

  } catch (error) {
    console.error(
      "Error al desactivar cliente:",
      error
    );

    if (error?.code === "permission-denied") {
      alert(
        "No tienes permisos para desactivar este cliente. Revisa las reglas de Firestore."
      );
      return;
    }

    if (error?.code === "unauthenticated") {
      alert(
        "La sesión no está activa. Inicia sesión nuevamente."
      );
      return;
    }

    alert(
      "No se pudo desactivar el cliente. Intenta nuevamente."
    );
  }
}

// ============================================================
// RENDERIZAR CLIENTES
// ============================================================

function renderClientes() {
  if (!clientesTableBody) {
    console.error(
      "No se encontró #clientesTableBody en clientes.html"
    );
    return;
  }

  const filteredClientes = getFilteredClientes();

  // Limpiar tabla
  clientesTableBody.innerHTML = "";

  // Contador
  setText(
    clientesCount,
    `${filteredClientes.length} cliente${
      filteredClientes.length === 1 ? "" : "s"
    } mostrado${
      filteredClientes.length === 1 ? "" : "s"
    }`
  );

  // Resumen
  if (tablaResumen) {
    tablaResumen.textContent =
      filteredClientes.length > 0
        ? `${filteredClientes.length} registro${
            filteredClientes.length === 1 ? "" : "s"
          }`
        : "Sin registros";
  }

  // ==========================================================
  // SIN RESULTADOS
  // ==========================================================

  if (filteredClientes.length === 0) {
    const row = document.createElement("tr");

    const cell = document.createElement("td");

    // 6 columnas
    cell.colSpan = 6;

    cell.className = "px-6 py-14 text-center";

    const wrapper = document.createElement("div");

    wrapper.className =
      "flex flex-col items-center justify-center";

    const icon = document.createElement("div");

    icon.className =
      "flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400";

    icon.textContent = "👤";

    const title = document.createElement("p");

    title.className =
      "mt-4 text-sm font-bold text-slate-700";

    title.textContent =
      "No hay clientes para mostrar";

    const description = document.createElement("p");

    description.className =
      "mt-1 text-xs text-slate-400";

    description.textContent = filtroActual
      ? "No existen clientes que coincidan con la búsqueda."
      : "Todavía no se han registrado clientes.";

    wrapper.append(
      icon,
      title,
      description
    );

    cell.appendChild(wrapper);

    row.appendChild(cell);

    clientesTableBody.appendChild(row);

    return;
  }

  // ==========================================================
  // CREAR FILAS
  // ==========================================================

  filteredClientes.forEach((cliente) => {

    const row = document.createElement("tr");

    row.className =
      "border-b border-slate-100 transition hover:bg-slate-50/70";

    // ========================================================
    // 1. CLIENTE
    // ========================================================

    const clienteCell =
      document.createElement("td");

    clienteCell.className =
      "px-6 py-4 text-left text-sm font-semibold text-slate-800";

    clienteCell.textContent =
      displayValue(cliente.nombre);

    // ========================================================
    // 2. TELÉFONO
    // ========================================================

    const telefonoCell =
      document.createElement("td");

    telefonoCell.className =
      "px-6 py-4 text-left text-sm font-medium text-slate-600";

    telefonoCell.textContent =
      displayValue(cliente.telefono);

    // ========================================================
    // 3. CORREO
    // ========================================================

    const correoCell =
      document.createElement("td");

    correoCell.className =
      "px-6 py-4 text-left text-sm font-medium text-slate-600";

    correoCell.textContent =
      displayValue(cliente.correo);

    // ========================================================
    // 4. ESTADO
    // ========================================================

    const estadoCell =
      document.createElement("td");

    estadoCell.className =
      "px-6 py-4 text-center";

    const estadoBadge =
      document.createElement("span");

    if (cliente.activo !== false) {

      estadoBadge.className =
        "inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700";

      estadoBadge.textContent =
        "Activo";

    } else {

      estadoBadge.className =
        "inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500";

      estadoBadge.textContent =
        "Inactivo";
    }

    estadoCell.appendChild(
      estadoBadge
    );

    // ========================================================
    // 5. REGISTRO
    // ========================================================

    const registroCell =
      document.createElement("td");

    registroCell.className =
      "px-6 py-4 text-center text-sm font-medium text-slate-600";

    registroCell.textContent =
      formatFecha(cliente.fechaRegistro);

    // ========================================================
    // 6. ACCIONES
    // ========================================================

    const accionesCell =
      document.createElement("td");

    accionesCell.className =
      "px-6 py-4 text-right";

    const acciones =
      document.createElement("div");

    acciones.className =
      "flex items-center justify-end gap-2";

    // --------------------------------------------------------
    // VER
    // --------------------------------------------------------

    const verButton =
      createActionButton(
        "Ver",
        "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700",
        () => {

          if (!cliente.id) {
            return;
          }

          window.location.href =
            `clientes-ver.html?id=${encodeURIComponent(cliente.id)}`;
        }
      );

    // --------------------------------------------------------
    // EDITAR
    // --------------------------------------------------------

    const editarButton =
      createActionButton(
        "Editar",
        "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700",
        () => {

          if (!cliente.id) {
            return;
          }

          window.location.href =
            `clientes-editar.html?id=${encodeURIComponent(cliente.id)}`;
        }
      );

    // --------------------------------------------------------
    // DESACTIVAR
    // --------------------------------------------------------

    const desactivarButton =
      createActionButton(
        "Desactivar",
        cliente.activo !== false
          ? "inline-flex items-center justify-center rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-200"
          : "inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-400",
        () => desactivarCliente(cliente)
      );

    // Si ya está inactivo, deshabilitar botón
    if (cliente.activo === false) {

      desactivarButton.disabled = true;

      desactivarButton.title =
        "El cliente ya está inactivo";

      desactivarButton.classList.add(
        "cursor-not-allowed"
      );
    }

    acciones.append(
      verButton,
      editarButton,
      desactivarButton
    );

    accionesCell.appendChild(
      acciones
    );

    // ========================================================
    // AGREGAR EXACTAMENTE 6 COLUMNAS
    // ========================================================

    row.append(
      clienteCell,
      telefonoCell,
      correoCell,
      estadoCell,
      registroCell,
      accionesCell
    );

    clientesTableBody.appendChild(
      row
    );
  });
}

// ============================================================
// ERROR DE FIRESTORE
// ============================================================

function renderLoadError(error) {

  console.error(
    "Error al cargar clientes:",
    error
  );

  if (!clientesTableBody) {
    return;
  }

  clientesTableBody.innerHTML = "";

  const row =
    document.createElement("tr");

  const cell =
    document.createElement("td");

  // 6 columnas
  cell.colSpan = 6;

  cell.className =
    "px-6 py-14 text-center";

  let mensaje =
    "No se pudieron cargar los clientes. Revisa tu conexión y la configuración de Firebase.";

  if (error?.code === "permission-denied") {

    mensaje =
      "Firestore rechazó la lectura. Verifica las reglas de Firestore y que el usuario haya iniciado sesión.";
  }

  if (error?.code === "unauthenticated") {

    mensaje =
      "La sesión no está activa. Inicia sesión nuevamente.";
  }

  if (error?.code === "unavailable") {

    mensaje =
      "Firestore no está disponible en este momento. Intenta nuevamente.";
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "flex flex-col items-center justify-center";

  const icon =
    document.createElement("div");

  icon.className =
    "flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500";

  icon.textContent = "⚠";

  const title =
    document.createElement("p");

  title.className =
    "mt-4 text-sm font-bold text-red-600";

  title.textContent =
    "Error al cargar clientes";

  const description =
    document.createElement("p");

  description.className =
    "mt-2 max-w-md text-xs leading-5 text-slate-400";

  description.textContent =
    mensaje;

  wrapper.append(
    icon,
    title,
    description
  );

  cell.appendChild(
    wrapper
  );

  row.appendChild(
    cell
  );

  clientesTableBody.appendChild(
    row
  );

  setText(
    clientesCount,
    "Error al cargar clientes"
  );

  if (tablaResumen) {
    tablaResumen.textContent =
      "Error";
  }
}

// ============================================================
// ESCUCHAR CLIENTES DE FIRESTORE
// ============================================================

function startClientesListener() {

  // Cancelar listener anterior
  if (clientesUnsubscribe) {
    clientesUnsubscribe();
  }

  clientesUnsubscribe =
    onSnapshot(
      clientesCollection,

      (snapshot) => {

        console.log(
          `Clientes recibidos desde Firestore: ${snapshot.size}`
        );

        clientes =
          snapshot.docs
            .map((clienteDoc) => ({
              id: clienteDoc.id,
              ...clienteDoc.data()
            }))
            .sort((a, b) => {

              return (
                getFechaTimestamp(
                  b.fechaRegistro
                ) -
                getFechaTimestamp(
                  a.fechaRegistro
                )
              );
            });

        renderClientes();
      },

      renderLoadError
    );
}

// ============================================================
// BUSCADOR
// ============================================================

if (buscarCliente) {

  buscarCliente.addEventListener(
    "input",
    (event) => {

      filtroActual =
        event.target.value.trim();

      renderClientes();
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

      console.warn(
        "No existe un usuario autenticado. No se iniciará la consulta."
      );

      if (clientesUnsubscribe) {

        clientesUnsubscribe();

        clientesUnsubscribe = null;
      }

      return;
    }

    console.log(
      "Usuario autenticado. Cargando clientes..."
    );

    startClientesListener();
  }
);