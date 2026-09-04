# Mi Control de Cobros

Sistema web personal para controlar clientes, deudas, pagos parciales, pagos completos, saldos pendientes e historial de cobros.

## Estado del proyecto

Fase actual: **Fase 1 - Estructura inicial**.

Esta fase solo prepara carpetas, archivos base, configuracion inicial de Firebase Hosting y reglas seguras de Firestore. No contiene todavia logica de clientes, deudas, pagos, dashboard ni autenticacion funcional.

## Tecnologias

- HTML5
- CSS3
- JavaScript moderno con modulos ES
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

No se utiliza backend propio, PHP, Laravel, MySQL, React, Angular, Vue ni Bootstrap.

## Estructura

```text
mi-control-cobros/
|-- public/
|   |-- index.html
|   |-- login.html
|   |-- clientes.html
|   |-- deudas.html
|   |-- pagos.html
|   |-- historial.html
|   |-- css/
|   |   |-- styles.css
|   |   |-- login.css
|   |   |-- dashboard.css
|   |   `-- responsive.css
|   |-- js/
|   |   |-- firebase-config.js
|   |   |-- auth.js
|   |   |-- dashboard.js
|   |   |-- clientes.js
|   |   |-- deudas.js
|   |   |-- pagos.js
|   |   |-- historial.js
|   |   `-- utils.js
|   `-- assets/
|       |-- img/
|       `-- icons/
|-- firebase.json
|-- firestore.rules
|-- firestore.indexes.json
|-- .firebaserc
`-- README.md
```

## Configuracion pendiente de Firebase

En la Fase 2 se debe crear o seleccionar un proyecto en Firebase Console y copiar la configuracion real de la aplicacion web en:

```text
public/js/firebase-config.js
```

No uses valores inventados. Reemplaza los placeholders `TU_API_KEY`, `TU_AUTH_DOMAIN`, `TU_PROJECT_ID`, `TU_STORAGE_BUCKET`, `TU_MESSAGING_SENDER_ID` y `TU_APP_ID` con los valores reales de Firebase Console.

Tambien reemplaza `TU_PROJECT_ID` en:

```text
.firebaserc
```

## Firestore

Las reglas iniciales exigen que el usuario este autenticado para leer o crear/modificar documentos en las colecciones previstas:

- `clientes`
- `deudas`
- `pagos`

Las eliminaciones estan bloqueadas inicialmente y cualquier otra coleccion queda denegada por defecto.

## Comandos previstos

Cuando llegue la fase de publicacion:

```bash
firebase login
firebase init
firebase deploy
```

Para publicar solo Hosting:

```bash
firebase deploy --only hosting
```

## Como probar esta fase

Abre los archivos HTML dentro de `public/` en el navegador para confirmar que cargan sus estilos basicos. Todavia no habra conexion funcional con Firebase ni operaciones de datos.

## Proximo paso

Continuar con la **Fase 2 - Firebase**, donde se configurara la app web en Firebase Console y se copiaran los valores reales en `public/js/firebase-config.js`.
