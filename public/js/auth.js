import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  auth
} from "./firebase-config.js";


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

const currentPage =
  path.split("/").pop() || "";


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

const loginMessageIcon =
  document.querySelector("#loginMessageIcon");

const loginMessageTitle =
  document.querySelector("#loginMessageTitle");

const loginMessageText =
  document.querySelector("#loginMessageText");

const logoutButton =
  document.querySelector("#logoutButton");

const loginButton =
  document.querySelector("#loginButton");

const loginButtonText =
  document.querySelector("#loginButtonText");

const loginButtonSpinner =
  document.querySelector("#loginButtonSpinner");

const loginButtonArrow =
  document.querySelector("#loginButtonArrow");


// ============================================================
// MOSTRAR MENSAJE
// Compatible con el nuevo diseño de login.css
// ============================================================

function showMessage(
  title,
  message,
  type = "error"
) {

  if (!loginMessage) {
    return;
  }


  loginMessage.classList.remove(
    "message-success",
    "message-error"
  );


  loginMessage.classList.add(
    type === "success"
      ? "message-success"
      : "message-error"
  );


  loginMessage.classList.add(
    "show"
  );


  if (loginMessageTitle) {

    loginMessageTitle.textContent =
      title;

  }


  if (loginMessageText) {

    loginMessageText.textContent =
      message;

  }


  if (loginMessageIcon) {

    loginMessageIcon.textContent =
      type === "success"
        ? "✓"
        : "!";

  }

}


// ============================================================
// OCULTAR MENSAJE
// ============================================================

function hideMessage() {

  if (!loginMessage) {
    return;
  }


  loginMessage.classList.remove(
    "show"
  );

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
// ESTADO DE CARGA DEL BOTÓN
// ============================================================

function setLoginLoading(
  loading
) {

  if (loginButton) {

    loginButton.disabled =
      loading;

  }


  if (!loading) {

    if (loginButtonSpinner) {

      loginButtonSpinner.classList.add(
        "hidden"
      );

    }


    if (loginButtonText) {

      loginButtonText.textContent =
        "Ingresar al sistema";

    }


    if (loginButtonArrow) {

      loginButtonArrow.classList.remove(
        "hidden"
      );

    }


    return;

  }


  if (loginButtonSpinner) {

    loginButtonSpinner.classList.remove(
      "hidden"
    );

  }


  if (loginButtonText) {

    loginButtonText.textContent =
      "Verificando...";

  }


  if (loginButtonArrow) {

    loginButtonArrow.classList.add(
      "hidden"
    );

  }

}


// ============================================================
// INICIO DE SESIÓN
// ============================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      hideMessage();


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


      const emailInput =
        document.querySelector("#email");


      const passwordInput =
        document.querySelector("#password");


      const emailError =
        document.querySelector("#emailError");


      const passwordError =
        document.querySelector("#passwordError");


      // --------------------------------------------------------
      // LIMPIAR ERRORES
      // --------------------------------------------------------

      if (emailError) {

        emailError.textContent =
          "";

      }


      if (passwordError) {

        passwordError.textContent =
          "";

      }


      if (emailInput) {

        emailInput.classList.remove(
          "input-error"
        );

      }


      if (passwordInput) {

        passwordInput.classList.remove(
          "input-error"
        );

      }


      // --------------------------------------------------------
      // VALIDAR CORREO
      // --------------------------------------------------------

      if (!email) {

        if (emailError) {

          emailError.textContent =
            "Ingresa tu correo electrónico.";

        }


        if (emailInput) {

          emailInput.classList.add(
            "input-error"
          );

          emailInput.focus();

        }


        return;

      }


      // --------------------------------------------------------
      // VALIDAR CONTRASEÑA
      // --------------------------------------------------------

      if (!password) {

        if (passwordError) {

          passwordError.textContent =
            "Ingresa tu contraseña.";

        }


        if (passwordInput) {

          passwordInput.classList.add(
            "input-error"
          );

          passwordInput.focus();

        }


        return;

      }


      // --------------------------------------------------------
      // ACTIVAR LOADING
      // --------------------------------------------------------

      setLoginLoading(
        true
      );


      showMessage(
        "Validando acceso",
        "Estamos verificando tus credenciales...",
        "success"
      );


      // --------------------------------------------------------
      // AUTENTICACIÓN FIREBASE
      // --------------------------------------------------------

      try {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


        /*
         * IMPORTANTE:
         *
         * No hacemos:
         *
         * window.location.href = "index.html";
         *
         * Firebase ejecutará:
         *
         * onAuthStateChanged()
         *
         * cuando confirme la autenticación.
         */


        showMessage(
          "Acceso correcto",
          "Ingresando al sistema...",
          "success"
        );


      } catch (error) {

        console.error(
          "Error de autenticación:",
          error
        );


        showMessage(
          "No se pudo iniciar sesión",
          getAuthErrorMessage(
            error.code
          ),
          "error"
        );


        setLoginLoading(
          false
        );

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

        logoutButton.disabled =
          true;


        await signOut(
          auth
        );


        /*
         * No redireccionamos manualmente.
         *
         * onAuthStateChanged()
         * detectará user = null
         * y enviará al Login.
         */


      } catch (error) {

        console.error(
          "Error al cerrar sesión:",
          error
        );


        logoutButton.disabled =
          false;

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
       * Estamos en Login:
       * nos quedamos allí.
       */

      if (isLoginPage) {

        setLoginLoading(
          false
        );

        return;

      }


      /*
       * Estamos en una página privada:
       * regresamos al Login.
       */

      window.location.replace(
        LOGIN_PAGE
      );

      return;

    }


    // ========================================================
    // USUARIO AUTENTICADO
    // ========================================================

    if (
      user &&
      isLoginPage
    ) {

      window.location.replace(
        DASHBOARD_PAGE
      );

      return;

    }

  }
);