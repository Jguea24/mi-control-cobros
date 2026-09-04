import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth } from "./firebase-config.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const LOGIN_PAGE = "login.html";
const DASHBOARD_PAGE = "index.html";


// ============================================================
// DETECTAR PÁGINA ACTUAL
// Compatible con:
// /login
// /login.html
// /
// /index
// /index.html
// ============================================================

const path = window.location.pathname
  .replace(/\/+$/, "")
  .toLowerCase();

const currentPage = path.split("/").pop() || "";

const isLoginPage =
  currentPage === "login" ||
  currentPage === "login.html";

const isDashboardPage =
  currentPage === "" ||
  currentPage === "index" ||
  currentPage === "index.html";


// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const loginForm =
  document.querySelector("#loginForm");

const loginMessage =
  document.querySelector("#loginMessage");

const logoutButton =
  document.querySelector("#logoutButton");


// ============================================================
// MOSTRAR MENSAJES
// ============================================================

function showMessage(
  message,
  type = "error"
) {

  if (!loginMessage) {
    return;
  }

  loginMessage.textContent = message;

  loginMessage.className =
    `form-message ${type}`;
}


// ============================================================
// MENSAJES DE FIREBASE
// ============================================================

function getAuthErrorMessage(
  errorCode
) {

  const messages = {

    "auth/invalid-email":
      "El correo no tiene un formato válido.",

    "auth/missing-password":
      "Ingresa tu contraseña.",

    "auth/invalid-credential":
      "Correo o contraseña incorrectos.",

    "auth/user-disabled":
      "Este usuario está desactivado.",

    "auth/too-many-requests":
      "Demasiados intentos. Intenta más tarde.",

    "auth/network-request-failed":
      "No hay conexión con el servidor. Revisa tu conexión a Internet.",

    "auth/user-not-found":
      "No existe un usuario con ese correo.",

    "auth/wrong-password":
      "La contraseña es incorrecta.",

    "auth/operation-not-allowed":
      "El inicio de sesión por correo no está habilitado."

  };

  return (
    messages[errorCode] ||
    "No se pudo iniciar sesión. Revisa tus datos."
  );
}


// ============================================================
// INICIO DE SESIÓN
// ============================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const formData =
        new FormData(loginForm);


      const email =
        String(
          formData.get("email") || ""
        ).trim();


      const password =
        String(
          formData.get("password") || ""
        );


      const submitButton =
        loginForm.querySelector(
          "button[type='submit']"
        );


      // ------------------------------------------
      // VALIDACIÓN
      // ------------------------------------------

      if (!email || !password) {

        showMessage(
          "Ingresa correo y contraseña.",
          "error"
        );

        return;
      }


      // ------------------------------------------
      // DESHABILITAR BOTÓN
      // ------------------------------------------

      if (submitButton) {

        submitButton.disabled = true;

      }


      showMessage(
        "Validando acceso...",
        "success"
      );


      // ------------------------------------------
      // AUTENTICACIÓN FIREBASE
      // ------------------------------------------

      try {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        /*
         * IMPORTANTE:
         *
         * No hacemos aquí:
         *
         * window.location.href = "index.html";
         *
         * Firebase ejecutará onAuthStateChanged()
         * cuando confirme la autenticación.
         */

      } catch (error) {

        console.error(
          "Error de autenticación:",
          error
        );


        showMessage(
          getAuthErrorMessage(
            error.code
          ),
          "error"
        );


        if (submitButton) {

          submitButton.disabled = false;

        }

      }

    }
  );

}


// ============================================================
// CERRAR SESIÓN
// ============================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        logoutButton.disabled = true;

        await signOut(auth);

        /*
         * No redireccionamos manualmente.
         *
         * onAuthStateChanged() detectará:
         *
         * user = null
         *
         * y enviará al Login.
         */

      } catch (error) {

        console.error(
          "Error al cerrar sesión:",
          error
        );


        logoutButton.disabled = false;

      }

    }
  );

}


// ============================================================
// CONTROL DEL ESTADO DE AUTENTICACIÓN
// ============================================================

onAuthStateChanged(
  auth,
  (user) => {

    console.log(
      "[AUTH]",
      user
        ? `Usuario autenticado: ${user.email}`
        : "Usuario no autenticado"
    );


    // ========================================================
    // NO HAY USUARIO
    // ========================================================

    if (!user) {

      /*
       * Si estamos en /login o /login.html,
       * simplemente permanecemos allí.
       *
       * NO hacemos redirect.
       */

      if (isLoginPage) {

        return;

      }


      /*
       * Si estamos en cualquier página privada,
       * enviamos al Login.
       */

      window.location.replace(
        LOGIN_PAGE
      );

      return;

    }


    // ========================================================
    // USUARIO AUTENTICADO
    // ========================================================

    if (user && isLoginPage) {

      /*
       * Ya inició sesión.
       *
       * Enviamos al Dashboard.
       */

      window.location.replace(
        DASHBOARD_PAGE
      );

      return;

    }

  }
);