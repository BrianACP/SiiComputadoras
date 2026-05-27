## Contexto Backend (Express/Node.js) — Portal 360

Este documento describe la arquitectura actual del backend Express/Node.js para evitar discrepancias de endpoints o de archivos de inicio entre asistentes.

---

## 1. Estructura de Archivos del Servidor

### Entrada / empaquetado
- `index.js` (raíz)
  - Punto de entrada que **inicia el servidor** y usa el `app` exportado desde `src/app.js`.
- `src/server.js`
  - Servicio alternativo (usado típicamente en `npm run dev`) que inicia Express pero **no monta** los routers de `src/app.js`.
  - En `src/server.js` actualmente se definen rutas de prueba como `/` y `/test-db`, pero no existen los prefijos `/api/*` (incluyendo `/api/auth`).
  - Nota: el montaje principal de endpoints para la API se encuentra en `src/app.js` (y se usa vía `index.js`).

### Aplicación Express
- `src/app.js`
  - Crea y configura la instancia `express()`.
  - Habilita middlewares globales:
    - `cors()`
    - `express.json()`
  - Define endpoints base:
    - `GET /api/health`
  - Monta los routers con prefijos:
    - `/api/auth`  -> `src/routes/authRoutes.js`
    - `/api/clientes` -> `src/routes/clienteRoutes.js`
    - `/api/feedback` -> `src/routes/feedbackRoutes.js`
    - `/api/dashboard` -> `src/routes/dashboardRoutes.js`

### Rutas (routers)
- `src/routes/authRoutes.js`
  - `POST /registro` -> `src/controllers/authController.js:registrarUsuario`
  - `POST /login` -> `src/controllers/authController.js:loginUsuario`

- `src/routes/clienteRoutes.js`
  - `POST /` (montado en `/api/clientes`) -> `clienteController.registrarCliente`
  - Protegido con `authMiddleware` (requiere JWT en header `Authorization`)

- `src/routes/feedbackRoutes.js`
  - `GET /config/:tipo` -> `feedbackController.obtenerConfiguracion`
  - `POST /responder` -> `feedbackController.guardarRespuesta`
  - `PUT /config/:tipo` -> `feedbackController.actualizarConfiguracion`
    - Protegido con `authMiddleware`

- `src/routes/dashboardRoutes.js`
  - `GET /kpis` -> `dashboardController.obtenerKPIs`
  - Protegido con `authMiddleware`

### Controladores (lógica de negocio)
- `src/controllers/authController.js`
  - Registro e inicio de sesión.
  - Interactúa con Supabase (tabla `usuarios`).
  - Usa `bcryptjs` para hash/verify de contraseña.
  - Usa `jsonwebtoken` para crear JWT.

- `src/controllers/clienteController.js`
  - Inserta clientes en Supabase (tabla `clientes`).

- `src/controllers/feedbackController.js`
  - Lee/actualiza configuración de encuestas (tabla `configuracion_encuestas`).
  - Guarda respuestas de encuestas (tabla `feedback_clientes`).
  - Valida que el `token_servicio` exista en la tabla `servicios`.

- `src/controllers/dashboardController.js`
  - Calcula KPIs combinando datos de `servicios`, `feedback_clientes` y relaciones hacia `clientes.company_name`.

### Middlewares
- `src/middlewares/authMiddleware.js`
  - Verifica JWT presente en `req.headers.authorization` con formato:
    - `Authorization: Bearer <token>`
  - Si es válido:
    - asigna `req.usuario = decodificado` y llama `next()`
  - Si falla:
    - responde `401` (token inválido/expirado) o `403` (no se proporcionó Bearer)

### Configuración de conexión a DB (Supabase)
- `src/config/supabaseClient.js`
  - Crea el cliente de Supabase con:
    - `process.env.SUPABASE_URL`
    - `process.env.SUPABASE_KEY`

- `db.js` (raíz)
  - Existe un archivo equivalente que también crea un cliente Supabase, pero **los controladores actualmente usan** `src/config/supabaseClient.js`.

---

## 2. Punto de Entrada (Entry Point)

### Cómo quedó unificado `index.js` con `src/app.js`
El servidor real para la API (incluyendo `POST /api/auth/login`) se monta desde:
- `src/app.js` (define rutas y prefijos)

Y el servidor se inicia desde:
- `index.js` (raíz) que hace:
  - `const app = require('./src/app')`
  - `app.listen(PORT, ...)`

### Qué pasa con `src/server.js`
`src/server.js` es un entry point independiente; si lo ejecutas (por ejemplo con `npm run dev`), **no** estarán montadas las rutas `/api/auth/*`, `/api/clientes/*`, etc. Para la API completa, el entry point correcto es `index.js`.

### Puerto de escucha
- `index.js` usa:
  - `const PORT = process.env.PORT || 3000;`

### Variables de entorno clave (`.env`)
El código requiere (nombres; los valores son secretos):
- `PORT` (opcional; si no existe, usa `3000`)
- `SUPABASE_URL` (obligatorio para inicializar Supabase)
- `SUPABASE_KEY` (obligatorio para inicializar Supabase)

Adicionalmente, la autenticación JWT usa:
- `JWT_SECRET`
  - Si no está definida en `.env`, el código utiliza un fallback interno (no recomendado para producción).

---

## 3. Catálogo de Endpoints de la API

> Nota: Las URLs listadas ya incluyen el prefijo de `src/app.js`.

| Método | URL | Middleware | Handler (controlador) |
|---|---|---|---|
| `GET` | `/api/health` | (ninguno) | (inline en `src/app.js`) |
| `POST` | `/api/auth/registro` | (ninguno) | `authController.registrarUsuario` |
| `POST` | `/api/auth/login` | (ninguno) | `authController.loginUsuario` |
| `POST` | `/api/clientes/` | `authMiddleware` | `clienteController.registrarCliente` |
| `GET` | `/api/feedback/config/:tipo` | (ninguno) | `feedbackController.obtenerConfiguracion` |
| `POST` | `/api/feedback/responder` | (ninguno) | `feedbackController.guardarRespuesta` |
| `PUT` | `/api/feedback/config/:tipo` | `authMiddleware` | `feedbackController.actualizarConfiguracion` |
| `GET` | `/api/dashboard/kpis` | `authMiddleware` | `dashboardController.obtenerKPIs` |

### Contratos (payloads) por endpoint
- `POST /api/auth/registro`
  - Body: `{ role_id, name, email, password }`
  - Acción: inserta en tabla `usuarios` campos `role_id, name, email, password_hash`

- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Acción:
    - busca usuario en `usuarios` por `email`
    - valida contraseña con `bcryptjs.compare`
    - emite JWT con `id` y `role_id` (expires `8h`)

- `POST /api/clientes/` (protegido)
  - Header: `Authorization: Bearer <token>`
  - Body: `{ contact_name, company_name, phone_number, email }`
  - Acción: inserta en tabla `clientes`

- `GET /api/feedback/config/:tipo`
  - Params: `tipo` (ej. `...`)
  - Acción: busca en `configuracion_encuestas` por `id = tipo.toUpperCase()`
  - Retorna: `preguntas`

- `POST /api/feedback/responder`
  - Body: `{ token_servicio, respuestas }`
  - Acción:
    - valida `token_servicio` contra tabla `servicios`
    - inserta en `feedback_clientes` con `servicio_id` y `respuestas`

- `PUT /api/feedback/config/:tipo` (protegido)
  - Header: `Authorization: Bearer <token>`
  - Params: `tipo`
  - Body: `{ preguntas }`
  - Acción: update en `configuracion_encuestas` (set `preguntas` y `updated_at`)

- `GET /api/dashboard/kpis` (protegido)
  - Header: `Authorization: Bearer <token>`
  - Acción:
    - cuenta total de `servicios`
    - obtiene respuestas desde `feedback_clientes` ordenado por `created_at`
    - calcula promedio y pendientes

---

## 4. Conexión a Base de Datos (Supabase / PostgreSQL)

### Cliente DB
La conexión se hace vía Supabase (que expone una API sobre PostgreSQL):
- `src/config/supabaseClient.js`
  - `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)`

Este cliente es el que usan los controladores:
- `src/controllers/authController.js`
- `src/controllers/clienteController.js`
- `src/controllers/feedbackController.js`
- `src/controllers/dashboardController.js`

### Tablas referenciadas por el backend
- `usuarios`
  - Usada en autenticación:
    - Insert: registro
    - Select por `email`: login
  - Campos esperados por el código:
    - `id`, `role_id`, `name`, `email`, `password_hash`

- `clientes`
  - Insert: registro de cliente
  - Campos usados:
    - `contact_name`, `company_name`, `phone_number`, `email`

- `configuracion_encuestas`
  - Lectura: busca `preguntas` por `id` (tipo en mayúsculas)
  - Actualización: set de `preguntas` y `updated_at`

- `servicios`
  - Validación: existe registro por `token` (para aceptar respuestas)
  - KPIs: conteo de `servicios`

- `feedback_clientes`
  - Inserción: guarda `servicio_id` + `respuestas`
  - Lectura:
    - Dashboard consulta con selección de `respuestas`, `created_at`
    - Usa relaciones hacia `servicios -> clientes` para obtener `company_name`

### Credenciales validadas por el endpoint de autenticación
`POST /api/auth/login` valida:
1. Credencial de usuario por correo (`usuarios.email`)
2. Contraseña:
   - compara el password recibido con `usuarios.password_hash` usando `bcryptjs`
3. Si es correcto, firma JWT con `JWT_SECRET` (fallback si no existe `JWT_SECRET` en `.env`)

---

## Notas importantes de compatibilidad (evitar discrepancias)
- El prefijo `/api/auth` y las rutas `/login` y `/registro` viven en:
  - `src/app.js` (monta `/api/auth`), y
  - `src/routes/authRoutes.js` (define `/login` y `/registro`)
- Si se ejecuta el servidor desde un entry point diferente al que carga `src/app.js`, pueden aparecer 404 en endpoints.

