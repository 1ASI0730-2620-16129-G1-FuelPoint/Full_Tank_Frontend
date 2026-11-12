# FullTank — integración con el backend .NET

Aplicación Vue con IAM, catálogo, inventario, equipos, pedidos, entregas,
pagos simulados, notificaciones y reportes. Esta copia usa la API real por defecto.

## Ejecutar en local

Requisitos: Node.js 22.12+ y npm, SDK .NET 10 y **PostgreSQL 18**.
El proveedor `MySql.EntityFrameworkCore` del backend no permite ejecutar sus
migraciones con la versión de MariaDB comprobada en esta integración.

1. Iniciar PostgreSQL en `127.0.0.1:5432`. Configurar la conexión y el secreto JWT
   en `../backend-main/TechnoSac.FullTank.Platform/appsettings.Local.json`
   (archivo ignorado por Git), o mediante variables de entorno .NET.
   No usar credenciales de producción en estas pruebas.
2. Iniciar la API desde `../backend-main`:

   ```bash
   Database__ApplyMigrationsOnStartup=true dotnet run \
     --project TechnoSac.FullTank.Platform --launch-profile http
   ```

   En Development se aplican las migraciones y el seeder de cuentas demo.
   Revisar el log de arranque: Swagger puede abrir aunque falle la conexión
   a la base de datos. Swagger: `http://localhost:5204/swagger`.
3. Desde esta carpeta, preparar el frontend:

   ```bash
   npm ci
   # Solo si todavía no existe .env:
   cp -n .env.example .env
   npm run dev
   ```

   Abrir `http://127.0.0.1:5173`. El backend admite CORS desde ese origen
   y desde `http://localhost:5173`.

La conexión usa `VITE_USE_FAKE_API=false` y
`VITE_FULLTANK_API_URL=http://localhost:5204/api/v1`.
Las peticiones privadas envían el JWT guardado en `fulltank.session`.
Las variables `VITE_*` son públicas: nunca incluir secretos en ellas.

## Cuentas locales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Comprador | `logistics@transportesdelsur.com` | `123456` |
| Proveedor | `dispatch@petroandes.com` | `123456` |

Las crea el seeder del backend en Development. Las operaciones reales persisten
sobre PostgreSQL. El pago está simulado para fines académicos; no procesa dinero.

## Validaciones

```bash
npm test                  # Pruebas aisladas: usan el adaptador en memoria
npm run build             # Compilación con la configuración de integración
npm run test:integration  # API real y PostgreSQL, con ambos servicios disponibles
```

La suite `tests/integration/backend.spec.js` usa los adaptadores y stores de la
aplicación contra `localhost:5204`. Verifica autenticación, CORS, restricciones
por rol, catálogo, favoritos, valoraciones, equipos, flota, reportes,
notificaciones, registro y el ciclo solicitud → aprobación → despacho →
recepción → pago simulado → factura. Comprueba persistencia, reserva y
consumo de stock. **Crea empresas y operaciones; ejecutarla solo con una base
local descartable.** No requiere reiniciar los datos para cada ejecución.

El backend tiene su propia suite:

```bash
cd ../backend-main
dotnet test full-tank-platform.sln
```

El frontend normaliza los códigos de unidad de la API (`L`, `LT`, `GAL`, etc.)
al leer recursos. No cambia las cantidades; muestra `M3` como `m³` y conserva
unidades desconocidas en vez de presentarlas como galones.

## Demo sin backend

```bash
npm run dev -- --mode demo
npm run build:demo
```

`.env.demo` mantiene el adaptador en memoria. `npm test` permanece aislado
independientemente del modo real configurado en `.env`.

## Alcance del despliegue

La validación descrita es local. Para publicar se necesita configurar la URL
HTTPS del backend, los orígenes CORS del frontend y la conexión PostgreSQL del entorno.

## Publicación desde GitHub

Ver [configuración del workflow](docs/despliegue-github.md). El despliegue de Firebase usa la API real y solo se ejecuta desde `main`.
