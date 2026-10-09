# FullTank — base compartida

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

Incluye Vue, Pinia, router mínimo, PrimeVue y dependencias comunes, ES/EN, pantalla inicial, layout responsive, página 404, recursos y utilidades de `shared`, cliente HTTP y un adaptador demo de CRUD genérico.

Solo hay rutas de inicio y 404. Login, cuentas demo, permisos, menús por rol, coordinación entre BC, comandos de negocio y despliegue se incorporan en sus entregas respectivas. No se incluyeron `src/iam`, `src/catalog`, `src/equipment`, `src/inventory`, `src/fulfillment`, `src/ordering`, `src/payment`, `src/notification` ni `src/reporting`.

La API demo de esta base no contiene reglas de negocio ni datos de esos BC. Las rutas no registradas responden 404. Cada responsable incorpora sus datos y operaciones al adaptar su módulo; copiarlo sin revisar sus dependencias no garantiza que funcione.

## Incorporar un BC

Después de integrar `feat/shared` en `develop`, crear la rama correspondiente desde ese `develop`: `feat/iam`, `feat/catalog`, `feat/equipment`, `feat/inventory`, `feat/fulfillment`, `feat/ordering`, `feat/payment`, `feat/notification` o `feat/reporting`. Las mejoras comunes siguen en `feat/shared`, sin sufijos.

1. Incorporar únicamente `src/<bc>/` y las pruebas del módulo.
2. Agregar sus claves de traducción y variables públicas de endpoints.
3. Registrar sus rutas en `src/router.js`; agregar permisos cuando IAM esté integrado. Importar los componentes PrimeVue que use cada vista (por ejemplo `import PvButton from 'primevue/button'`) y registrar los servicios que necesite el módulo. La base configura el tema, sin cargar todos los componentes por adelantado.
4. Para colecciones demo, registrar sus datos al arrancar el módulo:

```js
import { registerFakeCollection } from '../../shared/infrastructure/fake/fake-database.js';
registerFakeCollection('/endpoint-del-bc', [{ id: 1 }]);
```

El ejemplo corresponde a un archivo en `src/<bc>/infrastructure/`. Ajustar rutas/nombres y usar los contratos reales del BC. No repetir registros. Autenticación y comandos personalizados necesitan una ampliación explícita del adaptador en el PR correspondiente.

5. Ejecutar build demo y pruebas; revisar `git diff --stat origin/develop...HEAD`.
6. Abrir PR a `develop`, indicando el código reutilizado y los cambios propios. Otro integrante revisa antes del merge.

No mezclar el historial del zip anterior ni aplicar el import completo. Los aportes anteriores se recuperan selectivamente de las etiquetas `backup/tb1-restart-2026-10-08/<rama>`, conservando sus autores. La aplicación completa pasa a `main` después de integrar y verificar todos los BC.

## Archivos generados

`node_modules`, `dist`, `.firebase`, archivos de entorno locales y cobertura están ignorados. Nunca incluir secretos en variables `VITE_*`: su contenido se publica en el navegador.
