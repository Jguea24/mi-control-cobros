import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import { formatDate, normalizeText } from "./utils.js";

const clientesCollection = collection(db, "clientes");

const clientesTableBody = document.querySelector("#clientesTableBody");
const clientesCount = document.querySelector("#clientesCount");
const buscarCliente = document.querySelector("#buscarCliente");

let clientes = [];
let filtroActual = "";
let clientesUnsubscribe = null;
let fila = 0;

function showNotification(message, type = "error") {
  // Crear notificación simple (se puede mejorar después)
  const notification = document.createElement("div");
  notification.className = `fixed bottom-4 right-4 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg ${
    type === "error" ? "bg-red-500" : "bg-green-500"
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function getFilteredClientes() {
  const filtro = normalizeText(filtroActual);

  if (!filtro) {
    return clientes;
  }

  return clientes.filter((cliente) => {
    const texto = normalizeText([
      cliente.nombre,
      cliente.telefono,
      cliente.correo
    ].join(" "));

    return texto.includes(filtro);
  });
}

function renderEmptyState() {
  clientesTableBody.innerHTML = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  cell.className = "px-6 py-14 text-center";
  
  cell.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <div class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493 M15 19.128v-.003 c0-1.113-.285-2.16-.786-3.07 M15 19.128v.106A12.318 12.318 0 018.624 21 c-1.331 0-2.612-.21-3.814-.598 M15 19.128v-.003 a4.125 4.125 0 00-7.533-2.493 M8.624 21a12.318 12.318 0 01-6.75-2.001 M8.624 21v-.003 c0-1.113.285-2.16.786-3.07 M8.624 21a12.318 12.318 0 006.376-1.872 M8.624 21v-.003 a4.125 4.125 0 017.533-2.493 M12 14a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      </div>
      <h3 class="text-lg font-black text-slate-800">No hay clientes registrados</h3>
      <p class="max-w-sm text-sm leading-6 text-slate-400">Comienza agregando tu primer cliente haciendo clic en el botón superior.</p>
    </div>
  `;
  
  row.appendChild(cell);
  clientesTableBody.appendChild(row);
}

async function desactivarCliente(clienteId, clienteNombre) {
  // Confirmación
  if (!confirm(`¿Está seguro de que desea desactivar a "${clienteNombre}"?`)) {
    return;
  }

  try {
    await updateDoc(doc(db, "clientes", clienteId), {
      activo: false
    });
    showNotification("Cliente desactivado correctamente.", "success");
  } catch (error) {
    console.error("Error al desactivar:", error);
    showNotification("Error al desactivar el cliente.", "error");
  }
}

function renderClientes() {
  const filteredClientes = getFilteredClientes();

  clientesTableBody.innerHTML = "";
  
  if (filteredClientes.length === 0) {
    renderEmptyState();
    clientesCount.textContent = "No hay clientes para mostrar";
    return;
  }

  clientesCount.textContent = `${filteredClientes.length} cliente${filteredClientes.length === 1 ? "" : "s"} mostrado${filteredClientes.length === 1 ? "" : "s"}`;

  fila = 0;
  filteredClientes.forEach((cliente) => {
    fila++;
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50/50 transition";

    // Número de fila
    const numeroCell = document.createElement("td");
    numeroCell.className = "px-6 py-4 text-sm font-semibold text-slate-600";
    numeroCell.textContent = fila;

    // Nombre
    const nombreCell = document.createElement("td");
    nombreCell.className = "px-6 py-4 text-sm font-semibold text-slate-900";
    nombreCell.textContent = cliente.nombre || "-";

    // Teléfono
    const telefonoCell = document.createElement("td");
    telefonoCell.className = "px-6 py-4 text-sm text-slate-600";
    telefonoCell.textContent = cliente.telefono || "-";

    // Correo
    const correoCell = document.createElement("td");
    correoCell.className = "px-6 py-4 text-sm text-slate-600";
    correoCell.textContent = cliente.correo || "-";

    // Estado
    const estadoCell = document.createElement("td");
    estadoCell.className = "px-6 py-4 text-sm font-bold";
    estadoCell.textContent = cliente.activo === false ? "Inactivo" : "Activo";
    estadoCell.classList.add(cliente.activo === false ? "text-slate-400" : "text-emerald-700");

    // Acciones
    const actionsCell = document.createElement("td");
    actionsCell.className = "px-6 py-4 text-right";
    actionsCell.innerHTML = `
      <div class="flex items-center justify-end gap-1">
        <div class="group relative">
          <button class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Acciones">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
          <div class="absolute right-0 z-50 mt-1 hidden w-40 rounded-lg border border-slate-200 bg-white shadow-lg group-hover:block">
            <a href="clientes-ver.html?id=${cliente.id}" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Ver
            </a>
            <a href="clientes-editar.html?id=${cliente.id}" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Editar
            </a>
            <button onclick="window.desactivarCliente('${cliente.id}', '${cliente.nombre}')" class="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Desactivar
            </button>
          </div>
        </div>
      </div>
    `;

    row.append(numeroCell, nombreCell, telefonoCell, correoCell, estadoCell, actionsCell);
    clientesTableBody.appendChild(row);
  });
}

// Exponer función globalmente para botones inline
window.desactivarCliente = desactivarCliente;

// Event listeners
buscarCliente.addEventListener("input", (event) => {
  filtroActual = event.target.value;
  renderClientes();
});

function renderLoadError(error) {
  console.error("Error al cargar clientes:", error);
  clientesTableBody.innerHTML = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 8;
  cell.className = "px-6 py-14 text-center text-sm font-medium text-red-600";
  cell.textContent = error.code === "permission-denied"
    ? "Firestore rechazó la lectura. Verifica que hayas iniciado sesión."
    : "No se pudieron cargar los clientes. Intenta más tarde.";
  row.appendChild(cell);
  clientesTableBody.appendChild(row);
}

function startClientesListener() {
  if (clientesUnsubscribe) {
    clientesUnsubscribe();
  }

  const clientesQuery = query(clientesCollection, orderBy("fechaRegistro", "desc"));

  clientesUnsubscribe = onSnapshot(clientesQuery, (snapshot) => {
    clientes = snapshot.docs.map((clienteDoc) => ({
      id: clienteDoc.id,
      ...clienteDoc.data()
    }));

    renderClientes();
  }, renderLoadError);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (clientesUnsubscribe) {
      clientesUnsubscribe();
      clientesUnsubscribe = null;
    }
    renderEmptyState();
    return;
  }

  startClientesListener();
});
