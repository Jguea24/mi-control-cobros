# Security Rules Audit

## Firestore paths used by the app

- `clientes/{clienteId}`
- `deudas/{deudaId}`
- `pagos/{pagoId}`

## Queries used by the app

- `clientes`: `orderBy("nombre", "asc")`, `orderBy("fechaRegistro", "desc")`
- `deudas`: `orderBy("fechaRegistro", "desc")`
- `pagos`: `orderBy("fecha", "desc")`

## Write patterns

- `clientes`: create, update profile fields, set `activo: false`
- `deudas`: create initial debt, update payment fields through the payments transaction
- `pagos`: create payment document through a transaction

## Security hardening applied

- Default deny for all unspecified paths.
- Authentication required for all reads and writes.
- Strict allowed fields per collection.
- Required field checks on create and update.
- String size limits for every string field.
- Type checks for strings, booleans, numbers, and timestamps.
- Enum checks for `estado` and `metodoPago`.
- Immutable fields protected on update.
- Physical deletes denied.
- Payment creation must match the paired debt update using `getAfter()`.

## Assumptions

- This is a personal system. Any authenticated Firebase user is considered an authorized system user.
- Firebase Authentication user creation is controlled by the administrator.
- Dates entered from HTML forms are stored as `YYYY-MM-DD` strings.
- `fechaRegistro` is written using `serverTimestamp()`.
