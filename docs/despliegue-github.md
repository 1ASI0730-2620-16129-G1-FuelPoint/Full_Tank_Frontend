# Publicación del frontend integrado

El frontend se compila con la API REST real. Los pagos de la aplicación siguen
siendo académicos y simulados; esto es independiente de la conexión HTTP real.

En GitHub Settings → Secrets and variables → Actions:

- Variable `BACKEND_API_URL`: URL pública HTTPS del backend, terminada en `/api/v1`.
- Secret `FIREBASE_TOKEN`: credencial existente de Firebase Hosting. No copiarla en
  código, archivos `.env` versionados ni documentación.

El workflow ejecuta pruebas y `npm run build` en `develop` y `main`. Solo `main`
publica en Firebase. No se utiliza `build:demo`, que activa el adaptador en memoria.
La publicación reutiliza el artefacto validado, comprueba `/health` del backend y
verifica que `/deployment.json` identifica el commit publicado y la conexión real.

Los cambios siguen GitFlow: rama de trabajo → `develop` → release → `main`.
Para compilar manualmente definir `VITE_USE_FAKE_API=false` y
`VITE_FULLTANK_API_URL` con la URL pública. Todas las variables `VITE_*` son públicas:
no colocar contraseñas de PostgreSQL, claves JWT ni otras credenciales en ellas.
