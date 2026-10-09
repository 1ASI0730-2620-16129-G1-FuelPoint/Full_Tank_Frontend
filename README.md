# FullTank — base compartida e IAM

Base mínima de la aplicación Vue para integrar los BC por PR. El código previo fue desarrollado por Brayan; esta entrega reutiliza su configuración, recursos y utilidades, y adapta el arranque para funcionar sin los módulos pendientes.

## Ejecutar

Requiere Node.js 22.12+ (o 20.19+) y npm.

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. El modo demo está habilitado por defecto y no necesita backend. También puede iniciarse con `npm run dev -- --mode demo`.

```bash
npm run build:demo
npm test
npm run preview
```

## Alcance

Incluye Vue, Pinia, PrimeVue y dependencias comunes, ES/EN, pantalla inicial, layout responsive, página 404, recursos y utilidades de `shared`, cliente HTTP y adaptador demo extensible. IAM añade inicio de sesión, registro de compradores/proveedores, perfil de empresa, cambio de correo/contraseña y permisos de navegación.

Rutas disponibles: `/`, `/iam/login`, `/iam/register`, `/iam/profile`, `/iam/demo` y 404. Aún faltan catalog, equipment, inventory, fulfillment, ordering, payment, notification y reporting, además de la coordinación entre BC y el despliegue.

Las reglas y datos demo de IAM están en `src/iam/infrastructure/fake/`; shared ofrece CRUD genérico y registro de handlers por módulo. Las rutas de API no registradas responden 404. Cada responsable incorpora sus datos y operaciones al adaptar su módulo.

## Cuentas demo

| Rol | Correo | Contraseña |
|---|---|---|
| Comprador | `logistics@transportesdelsur.com` | `123456` |
| Proveedor | `dispatch@petroandes.com` | `123456` |

La sesión se guarda en localStorage. Los datos, cuentas nuevas y cambios del demo están en memoria y se reinician al recargar la página; las cuentas iniciales pueden restaurar su sesión. Una sesión cuyo usuario ya no existe se elimina. Este mecanismo es una simulación académica, no autenticación de producción.

## Incorporar un BC

Después de integrar `feat/shared` en `develop`, crear la rama correspondiente desde ese `develop`: `feat/iam`, `feat/catalog`, `feat/equipment`, `feat/inventory`, `feat/fulfillment`, `feat/ordering`, `feat/payment`, `feat/notification` o `feat/reporting`. Las mejoras comunes siguen en `feat/shared`, sin sufijos.

1. Incorporar únicamente `src/<bc>/` y las pruebas del módulo.
2. Agregar sus claves de traducción y variables públicas de endpoints.
3. Registrar sus rutas en `src/router.js`. Las rutas requieren sesión por defecto: usar `meta.public: true` para rutas públicas, `meta.roles: ['BUYER']` o `['PROVIDER']` para permisos explícitos y `meta.noShell: true` para pantallas sin layout. El guard conserva los permisos por prefijo del proyecto previo sin importar otros BC. Importar los componentes PrimeVue que use cada vista (por ejemplo `import PvButton from 'primevue/button'`). ToastService ya está registrado.
4. Para colecciones demo, registrar sus datos al arrancar el módulo:

```js
import { registerFakeCollection } from '../../shared/infrastructure/fake/fake-database.js';
registerFakeCollection('/endpoint-del-bc', [{ id: 1 }]);
```

El ejemplo corresponde a un archivo en `src/<bc>/infrastructure/`. Ajustar rutas/nombres y usar los contratos reales del BC. Para comandos de negocio, importar `registerFakeHandler` del mismo archivo y registrar callbacks del BC que reciban `{ body, params, query }` y devuelvan `{ status, data }`. La ruta puede ser un string exacto o una expresión regular con grupos nombrados; las reglas del negocio permanecen en el BC. No reemplazar registros de otros módulos.

5. Ejecutar build demo y pruebas; revisar `git diff --stat origin/develop...HEAD`.
6. Abrir PR a `develop`, indicando el código reutilizado y los cambios propios. Otro integrante revisa antes del merge.

Los commits nuevos usan inglés imperativo: `feat(iam): add authentication views and route guards`. No mezclar el historial del zip anterior ni aplicar el import completo. Los aportes anteriores se recuperan selectivamente de las etiquetas `backup/tb1-restart-2026-10-08/<rama>`, conservando sus autores. Con GitFlow, la aplicación completa pasa a `main` por una rama `release/<version>` después de integrar y verificar todos los BC; los ajustes de release vuelven también a `develop`.

## Archivos generados

`node_modules`, `dist`, `.firebase`, archivos de entorno locales y cobertura están ignorados. Nunca incluir secretos en variables `VITE_*`: su contenido se publica en el navegador.
