> Registro histórico de integración local con MySQL, anterior a la migración PostgreSQL del 12/11/2026. No acredita la validación del despliegue PostgreSQL.

# Validación local de integración — 3 de noviembre de 2026

Se conectó `frontend-backend` a la API .NET 10 real en `localhost:5204`,
con `VITE_USE_FAKE_API=false`, JWT y persistencia en MySQL 8.0.46.
El frontend está en `http://127.0.0.1:5173`; Swagger en
`http://localhost:5204/swagger`.

## Entorno utilizado

- Base de datos aislada en el contenedor `fulltank-integration-mysql`.
  Puerto MySQL publicado únicamente en `127.0.0.1:3306`.
  Puede volver a iniciarse con `docker start fulltank-integration-mysql`.
- Credenciales tomadas de la configuración local existente, sin incorporarlas
  a archivos versionados. No se modificó la base del sistema.
- Nueve migraciones aplicadas y datos iniciales cargados en Development.
- Las modificaciones previas de `backend-main` se conservaron sin cambios.

## Hallazgos y correcciones

1. **Motor de base de datos:** `MySql.EntityFrameworkCore` 10.0.7 falló con
   MariaDB 11.8.8 al adquirir el bloqueo de migración (`DBNull` a `Int64`).
   La validación se realizó con MySQL 8, donde las migraciones se aplicaron.
2. **Unidades:** los códigos reales `L` y `M3` aparecían como galones.
   Los assemblers normalizan los alias de litros/galones sin cambiar cantidades;
   las vistas usan un formato común y muestran `M3` como `m³`.
3. **Pruebas demo:** algunas heredaban el modo real del `.env`. `npm test`
   ahora usa el adaptador en memoria; `npm run test:integration` usa HTTP real.
4. **Navegación:** `/inventory` redirigía a `/products` y terminaba en 404.
   Se corrigieron las redirecciones relativas en los módulos afectados.
5. **Carga de órdenes:** `fetchOrders` y `fetchRequests` no devolvían sus
   promesas. Las pantallas que esperan sus resultados ahora pueden hacerlo.

## Evidencia

| Comprobación | Resultado |
|---|---|
| `npm test` | 125/125 pruebas, 17 archivos |
| `dotnet test full-tank-platform.sln` | 67/67 pruebas |
| `npm run test:integration` | 8/8 casos contra la API y MySQL reales |
| `npm run build` | Correcto |
| `npm run build:demo` | Correcto |
| Diagnósticos Serena de archivos editados y consumidores afectados | Sin errores ni advertencias |
| Navegación Chromium | 19 pantallas, 127 llamadas API, sin errores HTTP ni JavaScript |
| Creación y aprobación mediante formularios reales | 49 llamadas API, sin errores HTTP; sesión restaurada tras recarga |

La suite real usa los adaptadores y stores del frontend. Comprueba login y
restauración de usuario, credenciales incorrectas, JWT, CORS en ambos orígenes
locales, permisos por rol, catálogo, favoritos, valoraciones, equipos, flota,
reportes, notificaciones y registro de compradores/proveedores. También prueba
solicitud → aprobación → despacho → recepción → pago simulado → factura,
verificando la reserva, consumo y persistencia de stock.

Desde Chromium se enviaron solicitudes usando el formulario del catálogo y
se aprobaron con el usuario proveedor. Se recargó la aplicación para comprobar
la sesión y se verificó el formato de litros y metros cúbicos en el catálogo.

## Alcance

La integración comprobada es local. Los pagos son simulados y las pruebas
crean registros en la base aislada. La revisión de pantallas verifica carga,
navegación y ausencia de errores; no cubre cada operación CRUD de cada formulario.
No se ha validado carga concurrente ni el despliegue en Render. No se hicieron
commits, push ni despliegues.

Para repetir las pruebas y arrancar los servicios, consultar el README.
