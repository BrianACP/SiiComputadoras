# BACKEND_CONTEXT.md — Documentación Técnica Exhaustiva

> **Proyecto:** Portal de Evaluación 360 — SiiComputadoras  
> **Nombre del paquete:** `siicomputadorasiso9001`  
> **Versión:** 1.0.0  
> **Última actualización:** 2026-06-04  
> **Propósito de este documento:** Servir como base de conocimiento completa y reutilizable para cualquier desarrollador o Inteligencia Artificial que trabaje con este backend. No se omite ningún detalle.

---

# 1. Resumen General

## 1.1 Objetivo del Sistema

El sistema es una **API REST** que funciona como motor central del "Portal de Evaluación 360", un sistema diseñado para apoyar el proceso de **Certificación ISO 9001** de la empresa **SiiComputadoras**. Su propósito principal es:

1. Gestionar un directorio de **empleados** (técnicos de servicio).
2. Registrar **servicios de mantenimiento** realizados a clientes.
3. Administrar y distribuir **encuestas de satisfacción** personalizables vinculadas a cada servicio.
4. Recopilar **feedback de clientes** de forma automatizada y sin autenticación.
5. Calcular **KPIs** (indicadores clave de rendimiento) para un dashboard gerencial.
6. Gestionar la **configuración dinámica** de las preguntas de las encuestas ISO 9001.

## 1.2 Problema que Resuelve

SiiComputadoras necesita demostrar que recopila y analiza la satisfacción del cliente de forma sistemática, como parte de los requisitos de la norma ISO 9001. Antes de este sistema, el proceso era manual o inexistente. Este backend automatiza:

- El envío de encuestas de satisfacción tras cada servicio de mantenimiento.
- La recolección y almacenamiento estructurado de respuestas.
- La generación de métricas de satisfacción en tiempo real.
- La prevención de respuestas duplicadas mediante tokens únicos.

## 1.3 Alcance Actual

El backend cubre actualmente los siguientes módulos funcionales:

| Módulo | Estado |
|---|---|
| Autenticación (registro + login) | ✅ Completo |
| CRUD de Empleados | ✅ Completo |
| Registro de Clientes | ✅ Parcial (solo creación) |
| Registro de Servicios | ✅ Completo (listar + crear) |
| Encuestas de Satisfacción (público) | ✅ Completo |
| Configuración de Encuestas (admin) | ✅ Completo |
| Dashboard / KPIs | ✅ Completo |
| Integración con n8n (automatización) | ⏳ Pendiente |
| Notificaciones por email/WhatsApp | ⏳ Pendiente |

## 1.4 Estado Actual del Desarrollo

- **Fase:** Desarrollo activo / MVP funcional.
- **Commits:** 2 commits registrados en Git.
  - `624d9cd` — Primer commit del proyecto.
  - `d35266a` — feat: CRUD de directorio y creación de bandeja de servicios con Supabase.
- **Frontend asociado:** Aplicación Angular corriendo en `http://localhost:4200`.
- **Backend corriendo en:** `http://localhost:3000`.

---

# 2. Arquitectura

## 2.1 Arquitectura Utilizada

El proyecto implementa una **arquitectura MVC simplificada** (Model-View-Controller) adaptada a una API REST, donde:

- **Model (Modelo):** No existe una capa de modelos explícita. Supabase actúa como la capa de persistencia y se accede directamente desde los controladores a través del cliente Supabase (`@supabase/supabase-js`). Las tablas de PostgreSQL en Supabase representan los modelos.
- **View (Vista):** No aplica. El backend es una API REST pura que devuelve JSON. La vista la maneja el frontend Angular.
- **Controller (Controlador):** Archivos en `src/controllers/` que contienen toda la lógica de negocio, validaciones y llamadas a la base de datos.

Adicionalmente:
- **Routes (Rutas):** Archivos en `src/routes/` que definen los endpoints HTTP y asignan middlewares y controladores.
- **Middlewares:** Archivos en `src/middlewares/` que interceptan peticiones para validación/seguridad antes de llegar al controlador.

## 2.2 Patrones de Diseño Implementados

| Patrón | Dónde se aplica | Descripción |
|---|---|---|
| **MVC simplificado** | Estructura general | Separación de rutas, controladores y middlewares |
| **Middleware Chain** | `authMiddleware.js` | Cadena de middlewares de Express para interceptar y validar peticiones |
| **Singleton** | `supabaseClient.js` | Una única instancia del cliente Supabase compartida por todos los controladores |
| **Router Module** | `src/routes/*.js` | Cada recurso tiene su propio módulo de rutas independiente |
| **Fat Controller** | `src/controllers/*.js` | Los controladores contienen tanto la lógica de negocio como la interacción con la base de datos (sin capa de servicios separada) |
| **Token-Based Auth** | `authController.js`, `authMiddleware.js` | Autenticación sin estado basada en JWT |

## 2.3 Justificación de Decisiones Arquitectónicas

1. **Supabase en lugar de ORM:** Se eligió Supabase por su rapidez de desarrollo, hosting gratuito de PostgreSQL, API REST auto-generada, y panel de administración visual. Elimina la necesidad de configurar un servidor de base de datos propio.

2. **Sin capa de modelos:** Al usar el cliente de Supabase, las consultas se hacen directamente desde los controladores. Esto simplifica la estructura para un equipo pequeño, aunque sacrifica la separación de responsabilidades.

3. **Sin capa de servicios:** Los directorios `src/services/` y `src/utils/` existen pero están vacíos. La lógica de negocio vive en los controladores. Para un proyecto de este tamaño, esto es pragmático.

4. **Dos entry points (`index.js` y `src/server.js`):** `index.js` es el punto de entrada de producción que carga `src/app.js` con todas las rutas. `src/server.js` es un entry point alternativo para desarrollo que originalmente se usaba para pruebas pero que actualmente **no monta** las rutas de la API.

5. **Express 5:** Se usa Express v5.2.1 (versión mayor más reciente), que incluye mejoras en el manejo de promesas y middleware asíncrono.

## 2.4 Flujo General del Sistema

```
┌─────────────┐     HTTP Request      ┌──────────────┐
│   Frontend   │ ──────────────────►  │   Express     │
│   (Angular)  │                      │   Server      │
│  :4200       │                      │   :3000       │
└─────────────┘                      └──────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │   CORS         │
                                    │   Middleware    │
                                    └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │  express.json() │
                                    │  (Body Parser)  │
                                    └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │   Router       │
                                    │   (app.js)     │
                                    └───────┬───────┘
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                      ┌───────▼──┐   ┌──────▼──┐   ┌─────▼────┐
                      │  Ruta    │   │  Ruta   │   │  Ruta    │
                      │ Pública  │   │Protegida│   │ Health   │
                      └───┬──────┘   └──┬──────┘   └──────────┘
                          │             │
                          │      ┌──────▼──────┐
                          │      │ authMiddleware│
                          │      │ (JWT check)   │
                          │      └──────┬──────┘
                          │             │
                      ┌───▼─────────────▼───┐
                      │     Controller       │
                      │  (Lógica de negocio) │
                      └──────────┬──────────┘
                                 │
                      ┌──────────▼──────────┐
                      │   Supabase Client    │
                      │   (PostgreSQL)       │
                      └──────────┬──────────┘
                                 │
                      ┌──────────▼──────────┐
                      │   Supabase Cloud     │
                      │   (Base de datos)    │
                      └─────────────────────┘
```

**Flujo detallado de una petición protegida:**

1. El frontend Angular envía una petición HTTP con `Authorization: Bearer <token>` en los headers.
2. CORS valida que el origen sea `http://localhost:4200` (o el valor de `FRONTEND_URL`).
3. `express.json()` parsea el body de la petición.
4. El router de `app.js` dirige la petición al router del módulo correspondiente.
5. Si la ruta está protegida, `authMiddleware` extrae y verifica el JWT.
6. Si el token es válido, se inyecta `req.usuario = { id, role_id }` y se pasa al controlador.
7. El controlador ejecuta la lógica de negocio y consulta/modifica Supabase.
8. El controlador devuelve una respuesta JSON al frontend.

---

# 3. Tecnologías

## 3.1 Frameworks

| Framework | Versión | Propósito |
|---|---|---|
| **Express.js** | `^5.2.1` | Framework web para Node.js. Maneja routing, middlewares y HTTP |
| **Node.js** | (runtime) | Entorno de ejecución JavaScript del lado del servidor |

## 3.2 Librerías (Dependencias de Producción)

| Librería | Versión | Propósito |
|---|---|---|
| `@supabase/supabase-js` | `^2.106.1` | Cliente oficial de Supabase para interactuar con PostgreSQL |
| `bcrypt` | `^6.0.0` | Hashing de contraseñas (instalada pero **no utilizada** en el código actual) |
| `bcryptjs` | `^3.0.3` | Hashing de contraseñas en JavaScript puro (**esta es la que se usa activamente**) |
| `cors` | `^2.8.6` | Middleware para habilitar Cross-Origin Resource Sharing |
| `dotenv` | `^17.4.2` | Carga variables de entorno desde archivo `.env` |
| `express` | `^5.2.1` | Framework HTTP |
| `jsonwebtoken` | `^9.0.3` | Creación y verificación de tokens JWT |
| `pg` | `^8.21.0` | Driver nativo de PostgreSQL para Node.js (instalado pero **no utilizado directamente**; Supabase lo usa internamente) |

> **Nota importante:** Existen dos librerías de hashing instaladas (`bcrypt` y `bcryptjs`). El código **solo usa `bcryptjs`**. La librería `bcrypt` (nativa) está instalada pero no se importa en ningún archivo. Se recomienda eliminarla para reducir dependencias.

> **Nota importante:** El paquete `pg` está instalado pero el proyecto no lo importa directamente. Toda la interacción con PostgreSQL se hace a través del cliente de Supabase.

## 3.3 Dependencias de Desarrollo

| Librería | Versión | Propósito |
|---|---|---|
| `autoprefixer` | `^10.5.0` | PostCSS plugin (no relevante para el backend) |
| `postcss` | `^8.5.15` | Herramienta de transformación CSS (no relevante para el backend) |
| `tailwindcss` | `^4.3.0` | Framework CSS (no relevante para el backend) |

> **Nota:** Las devDependencies (`tailwindcss`, `postcss`, `autoprefixer`) son herramientas de frontend que probablemente fueron instaladas accidentalmente en este proyecto backend. No afectan la funcionalidad del servidor pero no deberían estar aquí.

## 3.4 Herramientas Externas

| Herramienta | Propósito |
|---|---|
| **Supabase** | BaaS (Backend as a Service). Provee PostgreSQL hospedado, API REST autogenerada, panel de administración y autenticación |
| **Git** | Control de versiones |
| **npm** | Gestor de paquetes de Node.js |
| **n8n** (futuro) | Plataforma de automatización de workflows. Planeada para automatizar envío de encuestas |

---

# 4. Estructura del Proyecto

## 4.1 Árbol Completo de Carpetas

```
SiiComputadoras/
├── .env                          # Variables de entorno (secretas, no versionadas)
├── .gitignore                    # Reglas de exclusión de Git
├── contexto-backend.md           # Documentación de contexto v1 (detallada)
├── contexto_backend.md           # Documentación de contexto v2 (resumida)
├── db.js                         # Cliente Supabase alternativo (LEGACY, no usado)
├── index.js                      # ⭐ Entry point principal del servidor
├── package.json                  # Configuración del proyecto y dependencias
├── package-lock.json             # Lockfile de dependencias exactas
├── BACKEND_CONTEXT.md            # Este documento
│
├── node_modules/                 # Dependencias instaladas (no versionado)
│
└── src/                          # ⭐ Código fuente principal
    ├── app.js                    # ⭐ Configuración de Express y montaje de rutas
    ├── server.js                 # Entry point alternativo para desarrollo
    │
    ├── config/                   # Configuraciones de servicios externos
    │   └── supabaseClient.js     # ⭐ Instancia singleton del cliente Supabase
    │
    ├── controllers/              # ⭐ Lógica de negocio
    │   ├── authController.js     # Registro e inicio de sesión
    │   ├── clienteController.js  # Registro de clientes
    │   ├── configuracionController.js  # CRUD de configuración de encuestas
    │   ├── dashboardController.js      # Cálculo de KPIs
    │   ├── empleadoController.js       # CRUD completo de empleados
    │   ├── feedbackController.js       # Encuestas públicas y gestión de feedback
    │   └── servicioController.js       # Gestión de servicios de mantenimiento
    │
    ├── middlewares/              # Interceptores de peticiones
    │   └── authMiddleware.js     # ⭐ Verificación de JWT
    │
    ├── routes/                   # Definición de endpoints HTTP
    │   ├── authRoutes.js         # Rutas de autenticación
    │   ├── clienteRoutes.js      # Rutas de clientes
    │   ├── configuracionRoutes.js # Rutas de configuración de encuestas
    │   ├── dashboardRoutes.js    # Rutas del dashboard
    │   ├── empleadoRoutes.js     # Rutas de empleados
    │   ├── feedbackRoutes.js     # Rutas de encuestas/feedback
    │   └── servicioRoutes.js     # Rutas de servicios
    │
    ├── services/                 # ⚠️ Directorio vacío (reservado para capa de servicios futura)
    │
    └── utils/                    # ⚠️ Directorio vacío (reservado para utilidades futuras)
```

## 4.2 Responsabilidad de Cada Carpeta

| Carpeta | Responsabilidad |
|---|---|
| `/` (raíz) | Archivos de configuración del proyecto (`package.json`, `.env`, `.gitignore`) y entry points del servidor |
| `src/` | Todo el código fuente de la aplicación |
| `src/config/` | Módulos de configuración y conexión a servicios externos (Supabase) |
| `src/controllers/` | Lógica de negocio. Cada controlador gestiona un recurso/dominio específico. Reciben `req` y `res`, procesan la lógica y devuelven respuestas JSON |
| `src/middlewares/` | Funciones que interceptan las peticiones HTTP antes de que lleguen al controlador. Usadas para autenticación y validación |
| `src/routes/` | Definición de los endpoints HTTP. Cada archivo mapea métodos HTTP + paths a controladores específicos, aplicando middlewares cuando es necesario |
| `src/services/` | Vacío. Reservado para extraer lógica de negocio compleja de los controladores en el futuro |
| `src/utils/` | Vacío. Reservado para funciones utilitarias compartidas (formateo, validaciones, helpers) |

## 4.3 Responsabilidad de Cada Archivo Importante

### Archivos Raíz

| Archivo | Responsabilidad |
|---|---|
| `index.js` | **Entry point principal.** Carga `dotenv`, importa `src/app.js`, inicia el servidor Express en el puerto configurado. Este es el archivo que debe ejecutarse para tener la API completa funcionando. Comando: `npm start` |
| `db.js` | **LEGACY.** Crea un cliente Supabase alternativo. NO es usado por ningún controlador actual. Los controladores usan `src/config/supabaseClient.js`. Puede eliminarse |
| `.env` | Contiene las variables de entorno secretas: `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `FRONTEND_URL` |
| `.gitignore` | Excluye de Git: `node_modules/`, `.env`, logs de debug, archivos del sistema operativo |
| `package.json` | Define el nombre del proyecto, versión, scripts de ejecución, y todas las dependencias |

### Archivos en `src/`

| Archivo | Responsabilidad |
|---|---|
| `app.js` | **Núcleo de la aplicación.** Crea la instancia de Express, configura CORS y body parser, define el endpoint de health check, y monta todos los routers con sus prefijos (`/api/auth`, `/api/clientes`, etc.) |
| `server.js` | **Entry point alternativo para desarrollo.** Carga `dotenv` e importa `src/app.js` para iniciar el servidor. Funcionalmente idéntico a `index.js` pero ubicado dentro de `src/`. Usado por el script `npm run dev` |

### Archivos en `src/config/`

| Archivo | Responsabilidad |
|---|---|
| `supabaseClient.js` | **Singleton del cliente Supabase.** Lee `SUPABASE_URL` y `SUPABASE_KEY` del entorno, valida que existan (imprime error en consola si faltan), crea la instancia de `createClient()` y la exporta. Todos los controladores importan esta instancia |

### Archivos en `src/controllers/`

| Archivo | Funciones exportadas | Responsabilidad |
|---|---|---|
| `authController.js` | `registrarUsuario`, `loginUsuario` | Registro de usuarios internos (inserta en tabla `usuarios` con contraseña hasheada). Login validando email + contraseña y generando JWT con expiración de 8 horas |
| `clienteController.js` | `registrarCliente` | Insertar un nuevo cliente en la tabla `clientes` con campos: `contact_name`, `company_name`, `phone_number`, `email` |
| `configuracionController.js` | `obtenerConfiguracion`, `actualizarConfiguracion` | Leer y actualizar la configuración de preguntas de encuestas ISO 9001. Usa la tabla `configuracion_encuestas` con ID fijo `'ISO9001'`. Implementa auto-creación: si el registro no existe, lo crea vacío mediante upsert |
| `dashboardController.js` | `obtenerKPIs` | Calcula métricas gerenciales: total de servicios, total de respuestas, encuestas pendientes, promedio de calificación. Cruza datos entre tablas `servicios`, `feedback_clientes` y `clientes`. Retorna los 10 comentarios más recientes |
| `empleadoController.js` | `obtenerEmpleados`, `crearEmpleado`, `actualizarEmpleado`, `eliminarEmpleado` | CRUD completo de empleados (técnicos). Incluye validación de campos obligatorios, verificación de existencia en updates/deletes, y protección contra eliminación de empleados con servicios asociados |
| `feedbackController.js` | `obtenerConfiguracion`, `guardarRespuesta`, `actualizarConfiguracion`, `obtenerEncuesta`, `enviarEncuesta` | Controlador más complejo. Gestiona: obtención de preguntas por tipo, guardado de respuestas con validación de token, actualización de configuración por tipo (upsert), obtención de encuesta pública por token, y envío de encuesta con validación de duplicados |
| `servicioController.js` | `obtenerServicios`, `crearServicio` | Listar servicios con JOIN a la tabla `empleados` para obtener el nombre del técnico. Crear nuevos servicios validando 5 campos obligatorios. El token de encuesta se autogenera en la base de datos |

### Archivos en `src/middlewares/`

| Archivo | Función exportada | Responsabilidad |
|---|---|---|
| `authMiddleware.js` | `verificarToken` | Intercepta peticiones HTTP protegidas. Extrae el token JWT del header `Authorization: Bearer <token>`. Verifica la firma y expiración del token. Si es válido, inyecta `req.usuario = { id, role_id }` y llama `next()`. Si falla, retorna 403 (sin token) o 401 (token inválido/expirado) |

### Archivos en `src/routes/`

| Archivo | Endpoints definidos | Requiere JWT |
|---|---|---|
| `authRoutes.js` | `POST /registro`, `POST /login` | ❌ No |
| `clienteRoutes.js` | `POST /` | ✅ Sí |
| `configuracionRoutes.js` | `GET /`, `PUT /` | ✅ Sí |
| `dashboardRoutes.js` | `GET /kpis` | ✅ Sí |
| `empleadoRoutes.js` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | ✅ Sí |
| `feedbackRoutes.js` | `GET /config/:tipo`, `POST /responder`, `PUT /config/:tipo`, `GET /:token`, `POST /:token` | ⚠️ Mixto |
| `servicioRoutes.js` | `GET /`, `POST /` | ✅ Sí |

---

# 5. Base de Datos

## 5.1 Motor Utilizado

- **Motor:** PostgreSQL (hospedado en Supabase Cloud).
- **Acceso:** A través del cliente oficial `@supabase/supabase-js` (no se usa el driver `pg` directamente).
- **URL del proyecto Supabase:** `https://lkwivpxauyspgpwjlfkw.supabase.co`
- **Tipo de clave usada:** `service_role` (acceso completo, sin RLS).

> **Advertencia de seguridad:** Se utiliza la clave `service_role` que bypasea las políticas de Row Level Security (RLS) de Supabase. Esto es aceptable para un backend de servidor, pero esta clave **nunca debe exponerse en el frontend**.

## 5.2 Esquema Completo

### Tabla: `usuarios`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generado | Identificador único del usuario |
| `role_id` | INTEGER/TEXT | NOT NULL | Identificador del rol del usuario |
| `name` | TEXT | NOT NULL | Nombre completo del usuario |
| `email` | TEXT | NOT NULL, UNIQUE | Correo electrónico (usado como credencial de login) |
| `password_hash` | TEXT | NOT NULL | Contraseña hasheada con bcryptjs (10 salt rounds) |
| `created_at` | TIMESTAMP | DEFAULT now() | Fecha de creación del registro |

**Propósito:** Almacenar las credenciales de los usuarios internos (gerentes/administradores) que acceden al panel administrativo.

---

### Tabla: `clientes`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generado | Identificador único del cliente |
| `contact_name` | TEXT | - | Nombre del contacto principal |
| `company_name` | TEXT | - | Nombre de la empresa/razón social |
| `phone_number` | TEXT | - | Número telefónico del contacto |
| `email` | TEXT | - | Correo electrónico del contacto |
| `created_at` | TIMESTAMP | DEFAULT now() | Fecha de registro |

**Propósito:** Catálogo de clientes a los cuales se les brinda servicio de mantenimiento.

---

### Tabla: `empleados`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generado | Identificador único del empleado |
| `nombre` | TEXT | NOT NULL | Nombre completo del empleado/técnico |
| `puesto` | TEXT | NOT NULL | Cargo o puesto del empleado |
| `telefono` | TEXT | NOT NULL | Número de teléfono del empleado |
| `created_at` | TIMESTAMP | DEFAULT now() | Fecha de registro |

**Propósito:** Directorio de empleados (técnicos de servicio) de SiiComputadoras.

---

### Tabla: `servicios`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generado | Identificador único del servicio |
| `folio` | TEXT | NOT NULL | Número de folio del servicio de mantenimiento |
| `cliente` | TEXT | NOT NULL | Nombre del cliente (texto libre, no FK) |
| `telefono_cliente` | TEXT | NOT NULL | Teléfono del cliente para el servicio |
| `descripcion_servicio` | TEXT | NOT NULL | Descripción del trabajo de mantenimiento realizado |
| `tecnico_id` | UUID | FOREIGN KEY → `empleados.id` | Técnico asignado al servicio |
| `estatus` | TEXT | DEFAULT (valor por defecto en DB) | Estado del servicio |
| `token` | TEXT | UNIQUE, auto-generado en DB | Token único para acceder a la encuesta de satisfacción |
| `created_at` | TIMESTAMP | DEFAULT now() | Fecha de creación del servicio |

**Propósito:** Registro de cada servicio de mantenimiento completado. Cada servicio genera automáticamente un token único en la base de datos para vincular la encuesta de satisfacción.

---

### Tabla: `feedback_clientes`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generado | Identificador único del feedback |
| `servicio_id` | UUID | FOREIGN KEY → `servicios.id` | Servicio al cual corresponde este feedback |
| `token_usado` | TEXT | UNIQUE | Token del servicio usado para enviar la encuesta (previene duplicados) |
| `respuestas` | JSONB | - | Objeto JSON con todas las respuestas de la encuesta |
| `respondido_at` | TIMESTAMP | - | Fecha en la que se completó la encuesta |
| `created_at` | TIMESTAMP | DEFAULT now() | Fecha de creación del registro |

**Propósito:** Almacenar las respuestas de las encuestas de satisfacción enviadas por los clientes.

> **Restricción de unicidad:** La columna `token_usado` tiene una restricción `UNIQUE`, lo que impide que un mismo token se use más de una vez. Si se intenta insertar un duplicado, PostgreSQL devuelve el código de error `23505` (unique violation), que el controlador maneja para informar "Ya hemos recibido una respuesta".

---

### Tabla: `configuracion_encuestas`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Identificador de la configuración (ej: `'ISO9001'`) |
| `preguntas` | JSONB | - | Array JSON con la definición de las preguntas de la encuesta |
| `updated_at` | TIMESTAMP | - | Última fecha de actualización |

**Propósito:** Almacenar la configuración dinámica de las preguntas de las encuestas. Permite modificar las preguntas sin cambiar el código.

**Esquema de cada pregunta dentro del array `preguntas`:**
```json
{
  "id": "string",
  "tipo": "calificacion | opciones | texto",
  "texto": "string (texto de la pregunta)",
  "config": {
    "min": "number (solo para tipo calificacion)",
    "max": "number (solo para tipo calificacion)",
    "simbolo": "string (solo para tipo calificacion, ej: '⭐')",
    "opciones": ["array de strings (solo para tipo opciones)"]
  }
}
```

## 5.3 Relaciones (Foreign Keys)

```
usuarios (standalone)

clientes (standalone — referenciada por servicios vía relación implícita)

empleados ◄──────────── servicios
    id     ◄── tecnico_id (FK)

servicios ◄──────────── feedback_clientes
    id     ◄── servicio_id (FK)

servicios ──────────────► clientes
    (relación implícita vía Supabase para JOINs en dashboard)

configuracion_encuestas (standalone)
```

**Diagrama de relaciones:**

```
┌───────────────┐       ┌───────────────┐       ┌───────────────────┐
│   empleados   │       │   servicios   │       │ feedback_clientes │
├───────────────┤       ├───────────────┤       ├───────────────────┤
│ id (PK)       │◄──FK──│ tecnico_id    │       │ id (PK)           │
│ nombre        │       │ id (PK)       │◄──FK──│ servicio_id       │
│ puesto        │       │ folio         │       │ token_usado (UQ)  │
│ telefono      │       │ cliente       │       │ respuestas (JSONB)│
│ created_at    │       │ telefono_cl.  │       │ respondido_at     │
└───────────────┘       │ descripcion   │       │ created_at        │
                        │ estatus       │       └───────────────────┘
                        │ token (UQ)    │
                        │ created_at    │       ┌───────────────────────┐
                        └───────────────┘       │configuracion_encuestas│
                                                ├───────────────────────┤
┌───────────────┐                               │ id (PK, TEXT)         │
│   clientes    │                               │ preguntas (JSONB)     │
├───────────────┤                               │ updated_at            │
│ id (PK)       │                               └───────────────────────┘
│ contact_name  │
│ company_name  │       ┌───────────────┐
│ phone_number  │       │   usuarios    │
│ email         │       ├───────────────┤
│ created_at    │       │ id (PK)       │
└───────────────┘       │ role_id       │
                        │ name          │
                        │ email (UQ)    │
                        │ password_hash │
                        │ created_at    │
                        └───────────────┘
```

## 5.4 Índices

Los índices son gestionados automáticamente por Supabase/PostgreSQL:
- **Índices primarios:** Uno por cada PRIMARY KEY (`id` en todas las tablas, `id` TEXT en `configuracion_encuestas`).
- **Índices únicos:** 
  - `usuarios.email` (UNIQUE)
  - `servicios.token` (UNIQUE)
  - `feedback_clientes.token_usado` (UNIQUE)

## 5.5 Restricciones y Reglas de Integridad

| Restricción | Tabla | Campo(s) | Descripción |
|---|---|---|---|
| PRIMARY KEY | Todas | `id` | Identificador único por registro |
| FOREIGN KEY | `servicios` | `tecnico_id` → `empleados.id` | Un servicio debe tener un técnico válido |
| FOREIGN KEY | `feedback_clientes` | `servicio_id` → `servicios.id` | Un feedback debe pertenecer a un servicio existente |
| UNIQUE | `usuarios` | `email` | No pueden existir dos usuarios con el mismo correo |
| UNIQUE | `servicios` | `token` | Cada servicio tiene un token de encuesta único |
| UNIQUE | `feedback_clientes` | `token_usado` | Un token solo puede usarse una vez para responder |
| NOT NULL | `empleados` | `nombre`, `puesto`, `telefono` | Validado a nivel de controlador (no confirmado en DB) |
| DEFAULT | `servicios` | `estatus` | Valor por defecto asignado por la base de datos |
| DEFAULT | `servicios` | `token` | Auto-generado por la base de datos |
| DEFAULT | Todas | `created_at` | Timestamp automático al insertar |

---

# 6. Modelos de Datos

## 6.1 Entidad: Usuario

- **Propósito:** Representar a un usuario interno (gerente/administrador) que puede acceder al panel administrativo del sistema.
- **Tabla:** `usuarios`
- **Campos:**
  - `id` (UUID) — Identificador auto-generado.
  - `role_id` (INTEGER/TEXT) — Rol del usuario. Se usa en el payload del JWT para control de acceso.
  - `name` (TEXT) — Nombre para mostrar en la interfaz.
  - `email` (TEXT) — Credencial de login, debe ser único.
  - `password_hash` (TEXT) — Hash bcryptjs con salt de 10 rondas.
- **Relaciones:** Ninguna FK directa. Independiente.
- **Validaciones en controlador:**
  - Registro: Se requiere `role_id`, `name`, `email`, `password`.
  - Login: Se requiere `email`, `password`.

## 6.2 Entidad: Cliente

- **Propósito:** Representar a una empresa o persona a la cual SiiComputadoras brinda servicios de mantenimiento.
- **Tabla:** `clientes`
- **Campos:**
  - `id` (UUID) — Auto-generado.
  - `contact_name` (TEXT) — Nombre del contacto.
  - `company_name` (TEXT) — Nombre de la empresa.
  - `phone_number` (TEXT) — Teléfono.
  - `email` (TEXT) — Correo electrónico.
- **Relaciones:** Referenciada implícitamente por `servicios` a través de joins en Supabase (dashboard).
- **Validaciones en controlador:** Ninguna validación explícita de campos obligatorios.

## 6.3 Entidad: Empleado

- **Propósito:** Representar a un técnico de servicio de SiiComputadoras.
- **Tabla:** `empleados`
- **Campos:**
  - `id` (UUID) — Auto-generado.
  - `nombre` (TEXT) — Nombre completo.
  - `puesto` (TEXT) — Cargo.
  - `telefono` (TEXT) — Número de contacto.
  - `created_at` (TIMESTAMP) — Auto-generado.
- **Relaciones:** Referenciado por `servicios.tecnico_id`.
- **Validaciones en controlador:**
  - Crear: `nombre`, `puesto`, `telefono` son obligatorios (retorna 400 si faltan).
  - Actualizar: No valida campos obligatorios (permite actualización parcial implícita).
  - Eliminar: Verifica que no tenga servicios asociados antes de eliminar (retorna 400 si tiene).

## 6.4 Entidad: Servicio

- **Propósito:** Representar un servicio de mantenimiento completado.
- **Tabla:** `servicios`
- **Campos:**
  - `id` (UUID) — Auto-generado.
  - `folio` (TEXT) — Número de folio del servicio.
  - `cliente` (TEXT) — Nombre del cliente (texto libre).
  - `telefono_cliente` (TEXT) — Teléfono del cliente.
  - `descripcion_servicio` (TEXT) — Descripción del trabajo realizado.
  - `tecnico_id` (UUID) — FK al empleado asignado.
  - `estatus` (TEXT) — Estado del servicio (valor por defecto en DB).
  - `token` (TEXT) — Token único para la encuesta (auto-generado en DB).
  - `created_at` (TIMESTAMP) — Auto-generado.
- **Relaciones:**
  - `tecnico_id` → `empleados.id` (FK).
  - Referenciado por `feedback_clientes.servicio_id`.
- **Validaciones en controlador:**
  - Crear: `folio`, `cliente`, `telefono_cliente`, `descripcion_servicio`, `tecnico_id` son todos obligatorios.

## 6.5 Entidad: Feedback del Cliente

- **Propósito:** Almacenar las respuestas de una encuesta de satisfacción.
- **Tabla:** `feedback_clientes`
- **Campos:**
  - `id` (UUID) — Auto-generado.
  - `servicio_id` (UUID) — FK al servicio evaluado.
  - `token_usado` (TEXT) — Token del servicio que se utilizó (previene re-envíos).
  - `respuestas` (JSONB) — Objeto/array con todas las respuestas.
  - `respondido_at` (TIMESTAMP) — Fecha de respuesta.
  - `created_at` (TIMESTAMP) — Auto-generado.
- **Relaciones:** `servicio_id` → `servicios.id` (FK).
- **Validaciones en controlador:**
  - Se valida que el token exista en `servicios`.
  - Se valida que no exista ya un registro con el mismo `token_usado` (duplicado).
  - Se valida que `respuestas` sea un array no vacío.

## 6.6 Entidad: Configuración de Encuestas

- **Propósito:** Almacenar la definición de las preguntas de las encuestas de forma dinámica.
- **Tabla:** `configuracion_encuestas`
- **Campos:**
  - `id` (TEXT) — Identificador de la configuración (ej: `'ISO9001'`).
  - `preguntas` (JSONB) — Array de objetos que definen las preguntas.
  - `updated_at` (TIMESTAMP) — Última actualización.
- **Relaciones:** Ninguna FK. Standalone.
- **Validaciones en controlador:**
  - `preguntas` debe ser un array (se valida con `Array.isArray()`).

---

# 7. API

## 7.1 Base URL

```
http://localhost:3000/api
```

## 7.2 Formato de Respuesta Estándar

El sistema utiliza dos formatos de respuesta que coexisten (esto es un punto de inconsistencia documentado):

**Formato con acentos (módulos más antiguos):**
```json
{
  "éxito": true,
  "mensaje": "Operación exitosa",
  "datos": { ... }
}
```

**Formato en inglés (módulos más recientes):**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

> **Nota de inconsistencia:** Las respuestas de error y éxito no siguen un formato uniforme en todo el proyecto. Algunos controladores usan `éxito`/`mensaje`/`datos`, mientras que otros usan `success`/`message`/`data`. Se recomienda unificar.

---

### Endpoint: Health Check

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/health` |
| **Método HTTP** | GET |
| **Autenticación** | ❌ No requerida |
| **Parámetros** | Ninguno |
| **Archivo** | `src/app.js` (inline) |

**Response (200):**
```json
{
  "estado": "ok",
  "mensaje": "API funcionando correctamente"
}
```

---

### Endpoint: Registro de Usuario

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/auth/registro` |
| **Método HTTP** | POST |
| **Autenticación** | ❌ No requerida |
| **Controlador** | `authController.registrarUsuario` |
| **Archivo de ruta** | `src/routes/authRoutes.js` |

**Request Body:**
```json
{
  "role_id": 1,
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "password": "contraseña123"
}
```

**Response (201 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Usuario registrado",
  "datos": [
    {
      "id": "uuid-generado",
      "role_id": 1,
      "name": "Juan Pérez",
      "email": "juan@empresa.com",
      "password_hash": "$2a$10$...",
      "created_at": "2026-06-04T..."
    }
  ]
}
```

**Response (500 - Error):**
```json
{
  "éxito": false,
  "error": "mensaje de error"
}
```

**Validaciones:**
- Ninguna validación explícita de campos obligatorios en el controlador.
- Si `email` es duplicado, Supabase retorna error de unique constraint.

**Reglas de negocio:**
- La contraseña se hashea con `bcryptjs` usando 10 rondas de salt.
- El `password_hash` se almacena, nunca la contraseña en texto plano.
- Este endpoint está abierto (sin autenticación). Se indica en comentarios que es "Solo para uso interno".

---

### Endpoint: Login de Usuario

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/auth/login` |
| **Método HTTP** | POST |
| **Autenticación** | ❌ No requerida |
| **Controlador** | `authController.loginUsuario` |

**Request Body:**
```json
{
  "email": "juan@empresa.com",
  "password": "contraseña123"
}
```

**Response (200 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Bienvenido",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "nombre": "Juan Pérez",
    "rol": 1
  }
}
```

**Response (401 - Credenciales inválidas):**
```json
{
  "éxito": false,
  "mensaje": "Credenciales inválidas"
}
```

**Response (500 - Error del servidor):**
```json
{
  "éxito": false,
  "error": "mensaje de error"
}
```

**Validaciones:**
1. Busca el usuario por `email` en la tabla `usuarios`.
2. Si no existe ningún usuario con ese email → 401.
3. Compara la contraseña con `bcryptjs.compare()` contra `password_hash`.
4. Si la contraseña no coincide → 401.

**Reglas de negocio:**
- No se diferencia entre "email no encontrado" y "contraseña incorrecta". Ambos retornan el mismo mensaje genérico "Credenciales inválidas" por seguridad.
- El JWT se firma con `JWT_SECRET` y expira en **8 horas** (una jornada laboral).
- El payload del JWT contiene: `{ id: usuario.id, role_id: usuario.role_id }`.
- Si `JWT_SECRET` no está definida en `.env`, se usa el fallback `'super_secreto_portal_360_2026'`.

---

### Endpoint: Registrar Cliente

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/clientes` |
| **Método HTTP** | POST |
| **Autenticación** | ✅ JWT requerido (`verificarToken`) |
| **Controlador** | `clienteController.registrarCliente` |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "contact_name": "María López",
  "company_name": "Empresa XYZ S.A.",
  "phone_number": "6141234567",
  "email": "maria@xyz.com"
}
```

**Response (201 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Cliente registrado exitosamente",
  "datos": [ { ... } ]
}
```

**Response (500 - Error):**
```json
{
  "éxito": false,
  "error": "mensaje de error"
}
```

**Validaciones:** Ninguna validación explícita de campos obligatorios en el controlador.

---

### Endpoint: Obtener Todos los Empleados

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/empleados` |
| **Método HTTP** | GET |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `empleadoController.obtenerEmpleados` |

**Response (200):**
```json
{
  "éxito": true,
  "datos": [
    {
      "id": "uuid",
      "nombre": "Carlos Técnico",
      "puesto": "Técnico en reparación",
      "telefono": "6149876543",
      "created_at": "2026-06-01T..."
    }
  ]
}
```

**Reglas de negocio:** Resultados ordenados por `created_at` descendente (más recientes primero).

---

### Endpoint: Crear Empleado

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/empleados` |
| **Método HTTP** | POST |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `empleadoController.crearEmpleado` |

**Request Body:**
```json
{
  "nombre": "Carlos Técnico",
  "puesto": "Técnico en reparación",
  "telefono": "6149876543"
}
```

**Response (201 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Empleado creado exitosamente.",
  "datos": [ { ... } ]
}
```

**Response (400 - Datos faltantes):**
```json
{
  "éxito": false,
  "mensaje": "Faltan datos obligatorios: nombre, puesto y telefono son requeridos."
}
```

**Validaciones:**
- `nombre`, `puesto` y `telefono` son obligatorios. Si falta alguno → 400.

---

### Endpoint: Actualizar Empleado

| Propiedad | Valor |
|---|---|
| **Ruta** | `PUT /api/empleados/:id` |
| **Método HTTP** | PUT |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `empleadoController.actualizarEmpleado` |
| **Parámetros de URL** | `id` — UUID del empleado |

**Request Body:**
```json
{
  "nombre": "Carlos Actualizado",
  "puesto": "Técnico Senior",
  "telefono": "6141112233"
}
```

**Response (200 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Empleado actualizado exitosamente.",
  "datos": [ { ... } ]
}
```

**Response (404 - No encontrado):**
```json
{
  "éxito": false,
  "mensaje": "No se encontró ningún empleado con el id: <id>"
}
```

**Validaciones:**
- Verifica que el update afecte al menos un registro. Si `data` está vacío → 404.

---

### Endpoint: Eliminar Empleado

| Propiedad | Valor |
|---|---|
| **Ruta** | `DELETE /api/empleados/:id` |
| **Método HTTP** | DELETE |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `empleadoController.eliminarEmpleado` |
| **Parámetros de URL** | `id` — UUID del empleado |

**Response (200 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Empleado con id <id> eliminado exitosamente."
}
```

**Response (400 - Tiene servicios asociados):**
```json
{
  "success": false,
  "message": "No se puede eliminar: el empleado tiene servicios registrados en el sistema"
}
```

**Response (404 - No encontrado):**
```json
{
  "éxito": false,
  "mensaje": "No se encontró ningún empleado con el id: <id>"
}
```

**Validaciones y reglas de negocio:**
1. Antes de eliminar, consulta la tabla `servicios` contando registros donde `tecnico_id = id`.
2. Si el empleado tiene servicios asociados (`count > 0`) → 400 con mensaje descriptivo.
3. Si el delete no afecta registros → 404.

> **Nota de inconsistencia:** La respuesta de error 400 usa `success`/`message` (inglés) mientras que la respuesta 404 usa `éxito`/`mensaje` (español).

---

### Endpoint: Obtener Servicios

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/servicios` |
| **Método HTTP** | GET |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `servicioController.obtenerServicios` |

**Response (200):**
```json
{
  "éxito": true,
  "datos": [
    {
      "id": "uuid",
      "folio": "SRV-001",
      "cliente": "Empresa XYZ",
      "telefono_cliente": "6141234567",
      "descripcion_servicio": "Mantenimiento preventivo a 3 equipos",
      "tecnico_id": {
        "nombre": "Carlos Técnico"
      },
      "estatus": "completado",
      "token": "abc123-unique-token",
      "created_at": "2026-06-01T..."
    }
  ]
}
```

**Reglas de negocio:**
- Ejecuta un JOIN implícito con Supabase: `tecnico_id(nombre)` para reemplazar el UUID del técnico con un objeto que contiene su nombre.
- Ordenados por `created_at` descendente.

---

### Endpoint: Crear Servicio

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/servicios` |
| **Método HTTP** | POST |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `servicioController.crearServicio` |

**Request Body:**
```json
{
  "folio": "SRV-002",
  "cliente": "Empresa ABC",
  "telefono_cliente": "6149998877",
  "descripcion_servicio": "Instalación de red en oficina",
  "tecnico_id": "uuid-del-tecnico"
}
```

**Response (201 - Éxito):**
```json
{
  "éxito": true,
  "mensaje": "Servicio registrado exitosamente. La encuesta fue generada.",
  "datos": [ { ... } ]
}
```

**Response (400 - Datos faltantes):**
```json
{
  "éxito": false,
  "mensaje": "Faltan datos obligatorios: folio, cliente, telefono_cliente, descripcion_servicio y tecnico_id son requeridos."
}
```

**Validaciones:**
- Los 5 campos (`folio`, `cliente`, `telefono_cliente`, `descripcion_servicio`, `tecnico_id`) son obligatorios.

**Reglas de negocio:**
- El campo `estatus` se asigna automáticamente por la base de datos (valor por defecto).
- El campo `token` se auto-genera en la base de datos. Este token se usa luego para la encuesta pública.

---

### Endpoint: Obtener Configuración de Encuesta (vía Feedback)

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/encuesta/config/:tipo` |
| **Método HTTP** | GET |
| **Autenticación** | ❌ No requerida (público) |
| **Controlador** | `feedbackController.obtenerConfiguracion` |
| **Parámetros de URL** | `tipo` — Tipo de encuesta (ej: `iso9001`) |

**Response (200 - Éxito):**
```json
{
  "exito": true,
  "preguntas": [ ... ]
}
```

**Response (404 - No encontrada):**
```json
{
  "exito": false,
  "mensaje": "Configuración no encontrada"
}
```

**Reglas de negocio:**
- El parámetro `tipo` se convierte a mayúsculas (`.toUpperCase()`) antes de buscar en la tabla.

---

### Endpoint: Guardar Respuesta de Encuesta (Legacy)

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/encuesta/responder` |
| **Método HTTP** | POST |
| **Autenticación** | ❌ No requerida (público) |
| **Controlador** | `feedbackController.guardarRespuesta` |

**Request Body:**
```json
{
  "token_servicio": "abc123-unique-token",
  "respuestas": { "p1": "5", "p2": "Excelente", "p3": "Todo bien" }
}
```

**Response (201 - Éxito):**
```json
{
  "exito": true,
  "mensaje": "¡Encuesta guardada con éxito!"
}
```

**Response (400 - Token inválido):**
```json
{
  "exito": false,
  "mensaje": "Enlace de encuesta inválido o expirado"
}
```

**Response (400 - Duplicado, código Postgres 23505):**
```json
{
  "exito": false,
  "mensaje": "Ya hemos recibido una respuesta. ¡Gracias!"
}
```

**Validaciones:**
1. Valida que `token_servicio` exista en la tabla `servicios`.
2. Si el insert falla con código `23505` (unique violation), informa que ya fue respondida.

---

### Endpoint: Actualizar Configuración de Encuesta (vía Feedback)

| Propiedad | Valor |
|---|---|
| **Ruta** | `PUT /api/encuesta/config/:tipo` |
| **Método HTTP** | PUT |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `feedbackController.actualizarConfiguracion` |
| **Parámetros de URL** | `tipo` — Tipo de encuesta |

**Request Body:**
```json
{
  "preguntas": [
    { "id": "q1", "tipo": "calificacion", "texto": "¿Cómo califica...?", "config": { "min": 1, "max": 5, "simbolo": "⭐" } }
  ]
}
```

**Response (200 - Éxito):**
```json
{
  "exito": true,
  "mensaje": "¡Preguntas actualizadas con éxito!",
  "preguntas": [ ... ],
  "data": [ ... ]
}
```

**Reglas de negocio:**
- Usa `upsert` con `onConflict: 'id'`. Si el registro no existe, lo crea; si existe, lo actualiza.
- Actualiza automáticamente `updated_at` con la fecha actual.

---

### Endpoint: Obtener Encuesta Pública por Token

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/encuesta/:token` |
| **Método HTTP** | GET |
| **Autenticación** | ❌ No requerida (público) |
| **Controlador** | `feedbackController.obtenerEncuesta` |
| **Parámetros de URL** | `token` — Token único del servicio |

**Response (200 - Éxito):**
```json
{
  "success": true,
  "data": {
    "folio": "SRV-001",
    "cliente": "Empresa XYZ",
    "tecnico_id": "uuid-tecnico",
    "preguntas": [ ... ]
  }
}
```

**Response (404 - No encontrada):**
```json
{
  "success": false,
  "message": "Encuesta no encontrada"
}
```

**Response (409 - Ya respondida):**
```json
{
  "success": false,
  "message": "Esta encuesta ya fue respondida"
}
```

**Validaciones y reglas de negocio:**
1. Busca el servicio por `token` en la tabla `servicios`.
2. Verifica si ya existe un registro en `feedback_clientes` con `token_usado = token`.
3. Si ya fue respondida → 409 Conflict.
4. Carga las preguntas desde `configuracion_encuestas` con `id = 'ISO9001'`.
5. Retorna los datos del servicio junto con las preguntas.

---

### Endpoint: Enviar Encuesta Respondida

| Propiedad | Valor |
|---|---|
| **Ruta** | `POST /api/encuesta/:token` |
| **Método HTTP** | POST |
| **Autenticación** | ❌ No requerida (público) |
| **Controlador** | `feedbackController.enviarEncuesta` |
| **Parámetros de URL** | `token` — Token único del servicio |

**Request Body:**
```json
{
  "respuestas": [
    { "pregunta_id": "q1", "valor": 5 },
    { "pregunta_id": "q2", "valor": "Excelente" }
  ]
}
```

**Response (201 - Éxito):**
```json
{
  "success": true,
  "message": "Encuesta registrada correctamente"
}
```

**Response (404 - No encontrada):**
```json
{
  "success": false,
  "message": "Encuesta no encontrada"
}
```

**Response (409 - Ya respondida):**
```json
{
  "success": false,
  "message": "Esta encuesta ya fue respondida"
}
```

**Response (400 - Respuestas inválidas):**
```json
{
  "success": false,
  "message": "Respuestas invalidas o incompletas"
}
```

**Validaciones:**
1. Verifica que el token exista en `servicios`.
2. Verifica que no haya un feedback existente con `token_usado = token`.
3. Valida que `respuestas` sea un array no vacío.

**Reglas de negocio:**
- Inserta en `feedback_clientes` con: `servicio_id`, `token_usado`, `respuestas` (JSONB) y `respondido_at`.
- El `token_usado` UNIQUE previene respuestas duplicadas a nivel de base de datos.

---

### Endpoint: Obtener Configuración de Encuestas (Admin)

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/configuracion` |
| **Método HTTP** | GET |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `configuracionController.obtenerConfiguracion` |

**Response (200 - Éxito, existe):**
```json
{
  "success": true,
  "data": {
    "id": "ISO9001",
    "preguntas": [ ... ],
    "updated_at": "2026-06-01T..."
  }
}
```

**Response (200 - Éxito, auto-creado):**
```json
{
  "success": true,
  "data": {
    "id": "ISO9001",
    "preguntas": []
  }
}
```

**Reglas de negocio:**
- Siempre busca el registro con `id = 'ISO9001'`.
- Si el registro no existe o hay error, **lo crea automáticamente** con `preguntas: []` usando upsert.
- **Nunca retorna 404.** Garantiza que siempre hay un registro disponible.
- Incluye logs de diagnóstico en consola (`console.log`).

---

### Endpoint: Actualizar Configuración de Encuestas (Admin)

| Propiedad | Valor |
|---|---|
| **Ruta** | `PUT /api/configuracion` |
| **Método HTTP** | PUT |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `configuracionController.actualizarConfiguracion` |

**Request Body:**
```json
{
  "preguntas": [
    { "id": "q1", "tipo": "calificacion", "texto": "¿Qué tan satisfecho...?", "config": { "min": 1, "max": 5, "simbolo": "⭐" } },
    { "id": "q2", "tipo": "opciones", "texto": "¿Recomendaría...?", "config": { "opciones": ["Sí", "No", "Tal vez"] } },
    { "id": "q3", "tipo": "texto", "texto": "Comentarios adicionales", "config": {} }
  ]
}
```

**Response (200 - Éxito):**
```json
{
  "success": true,
  "message": "Configuracion guardada"
}
```

**Response (400 - Validación fallida):**
```json
{
  "success": false,
  "message": "El campo preguntas es requerido y debe ser un array"
}
```

**Validaciones:**
- `preguntas` debe existir y ser un `Array` (validado con `Array.isArray()`).

**Reglas de negocio:**
- Usa upsert con `id = 'ISO9001'` y `onConflict: 'id'`.
- Actualiza `updated_at` con la fecha actual.

---

### Endpoint: Dashboard KPIs

| Propiedad | Valor |
|---|---|
| **Ruta** | `GET /api/dashboard/kpis` |
| **Método HTTP** | GET |
| **Autenticación** | ✅ JWT requerido |
| **Controlador** | `dashboardController.obtenerKPIs` |

**Response (200 - Éxito):**
```json
{
  "exito": true,
  "kpis": {
    "enviadas": 50,
    "respondidas": 30,
    "pendientes": 20,
    "promedio": "4.2"
  },
  "recientes": [
    {
      "cliente": "Empresa XYZ S.A.",
      "fecha": "2026-06-01T...",
      "calificacion": 5,
      "comentario": "Excelente servicio"
    }
  ]
}
```

**Reglas de negocio:**
1. `enviadas` = conteo total de registros en `servicios`.
2. `respondidas` = conteo total de registros en `feedback_clientes`.
3. `pendientes` = `enviadas` - `respondidas`.
4. `promedio` = promedio de la primera pregunta (`respuestas.p1`) de todas las encuestas que tengan calificación > 0. Redondeado a 1 decimal.
5. `recientes` = los últimos 10 comentarios, cada uno con el nombre de la empresa del cliente (obtenido mediante JOIN: `feedback_clientes → servicios → clientes.company_name`), fecha, calificación y comentario (`respuestas.p3`).
6. Si un feedback no tiene empresa asociada, muestra `'Cliente Anónimo'`.
7. Si no hay comentario, muestra `'Sin comentarios'`.

---

# 8. Seguridad

## 8.1 Autenticación

- **Método:** JSON Web Tokens (JWT).
- **Librería:** `jsonwebtoken` v9.0.3.
- **Flujo:**
  1. El usuario envía `POST /api/auth/login` con email y contraseña.
  2. El servidor valida las credenciales contra la tabla `usuarios`.
  3. Si son correctas, genera un JWT firmado con `JWT_SECRET`.
  4. El frontend almacena el token y lo envía en cada petición protegida.

- **Configuración del JWT:**
  - **Algoritmo:** HS256 (por defecto de `jsonwebtoken`).
  - **Expiración:** 8 horas (`expiresIn: '8h'`).
  - **Payload:** `{ id: usuario.id, role_id: usuario.role_id }`.
  - **Clave secreta:** Variable de entorno `JWT_SECRET`. Fallback: `'super_secreto_portal_360_2026'`.

## 8.2 Autorización

- **Método:** Middleware `verificarToken` aplicado a nivel de ruta.
- **Granularidad actual:** Binaria (autenticado vs no autenticado). No hay verificación de `role_id` dentro de los controladores actualmente.
- Las rutas se clasifican en:
  - **Públicas (sin JWT):** Login, registro, obtener encuesta, responder encuesta, obtener configuración pública.
  - **Protegidas (con JWT):** Todo lo demás (CRUD empleados, servicios, clientes, dashboard, configuración admin).

## 8.3 Roles

- El campo `role_id` se almacena en la tabla `usuarios` y se incluye en el payload del JWT.
- **Actualmente no se implementa** verificación de roles en los controladores. Cualquier usuario autenticado puede acceder a todas las rutas protegidas.
- Los roles están preparados para implementación futura, pero no se han definido valores ni permisos.

## 8.4 Permisos

No existe un sistema de permisos implementado. Todas las rutas protegidas son accesibles por cualquier usuario autenticado, independientemente de su `role_id`.

## 8.5 Tokens

| Tipo de Token | Propósito | Generación | Validación |
|---|---|---|---|
| JWT (autenticación) | Autenticar usuarios internos | Generado en `authController.loginUsuario` al hacer login | Validado en `authMiddleware.verificarToken` en cada petición protegida |
| Token de servicio (encuesta) | Vincular una encuesta a un servicio específico | Auto-generado por la base de datos al crear un servicio | Validado en `feedbackController` al obtener/enviar encuesta |

## 8.6 Middleware de Seguridad

### `verificarToken` (`src/middlewares/authMiddleware.js`)

**Flujo de ejecución:**

1. Lee `req.headers.authorization`.
2. Si no existe o no empieza con `'Bearer '` → Responde **403** con `"Acceso denegado. No se proporcionó un token válido."`.
3. Extrae el token: `authHeader.split(' ')[1]`.
4. Ejecuta `jwt.verify(token, JWT_SECRET)`.
5. Si es válido → Asigna `req.usuario = decodificado` (contiene `{ id, role_id }`) y llama `next()`.
6. Si falla (token inválido, expirado, malformado) → Responde **401** con `"Token inválido o expirado. Por favor, inicia sesión nuevamente."`.

## 8.7 Hashing de Contraseñas

- **Librería:** `bcryptjs` (implementación JavaScript pura de bcrypt).
- **Salt rounds:** 10 (estándar para la mayoría de aplicaciones).
- **Proceso de registro:** `bcrypt.genSalt(10)` → `bcrypt.hash(password, salt)` → almacena `password_hash`.
- **Proceso de login:** `bcrypt.compare(password, usuario.password_hash)`.

## 8.8 CORS

- **Librería:** `cors` middleware.
- **Configuración:**
  ```javascript
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  };
  ```
- Solo permite peticiones desde el origen configurado. Por defecto, `http://localhost:4200` (Angular dev server).

## 8.9 Consideraciones de Seguridad Pendientes

1. **Rate limiting:** No implementado. La API es vulnerable a ataques de fuerza bruta en el login.
2. **Validación de input:** No hay sanitización de datos de entrada. Posible vulnerabilidad a inyección si Supabase no maneja correctamente los parámetros.
3. **Helmet:** No se usa el middleware `helmet` para headers de seguridad HTTP.
4. **HTTPS:** No configurado (se confía en el proxy/hosting para TLS).
5. **Refresh tokens:** No implementados. Cuando el JWT expira, el usuario debe hacer login de nuevo.
6. **Verificación de roles:** El `role_id` se incluye en el JWT pero no se usa para restringir acceso a rutas específicas.
7. **Endpoint de registro abierto:** `POST /api/auth/registro` no requiere autenticación. Cualquiera puede crear usuarios.

---

# 9. Reglas de Negocio

## 9.1 Reglas de Autenticación

1. Un usuario se identifica por su `email` (único en el sistema).
2. Las contraseñas nunca se almacenan en texto plano; siempre se hashean con bcryptjs.
3. Un JWT válido tiene duración de 8 horas (jornada laboral).
4. Los mensajes de error de login son genéricos para no revelar si el email existe o no.

## 9.2 Reglas de Empleados

1. Un empleado requiere `nombre`, `puesto` y `telefono` para ser registrado.
2. Un empleado **no puede ser eliminado** si tiene servicios de mantenimiento asociados en la tabla `servicios`. Se debe reasignar o eliminar los servicios primero.
3. La lista de empleados se muestra ordenada por fecha de creación (más recientes primero).

## 9.3 Reglas de Servicios

1. Un servicio requiere 5 campos obligatorios: `folio`, `cliente`, `telefono_cliente`, `descripcion_servicio`, `tecnico_id`.
2. Al crear un servicio, la base de datos autogenera un `token` único y un `estatus` por defecto.
3. Cada servicio debe estar asociado a un empleado/técnico existente (`tecnico_id`).
4. La lista de servicios incluye el nombre del técnico asignado (JOIN con `empleados`).

## 9.4 Reglas de Encuestas

1. Cada servicio tiene un token único que da acceso a una encuesta de satisfacción.
2. Una encuesta solo puede ser respondida **una vez** por token (restricción UNIQUE en `token_usado`).
3. Si se intenta responder una encuesta ya respondida, se retorna 409 Conflict.
4. Las preguntas de la encuesta son dinámicas y configurables desde el panel admin.
5. Las preguntas se almacenan como JSONB y soportan 3 tipos: `calificacion`, `opciones`, `texto`.
6. La encuesta pública **no requiere autenticación** — cualquier persona con el token puede responder.
7. La configuración de preguntas se busca siempre con el ID fijo `'ISO9001'`.

## 9.5 Reglas del Dashboard

1. Los KPIs se calculan en tiempo real a partir de las tablas `servicios` y `feedback_clientes`.
2. El promedio de satisfacción se basa en `respuestas.p1` (primera pregunta, asumida como calificación numérica).
3. Solo se consideran calificaciones mayores a 0 para el promedio.
4. Se muestran los 10 comentarios más recientes.
5. Si un feedback no tiene empresa asociada, se muestra "Cliente Anónimo".

## 9.6 Reglas de Configuración

1. Si la configuración de encuestas ISO 9001 no existe al consultarla, se crea automáticamente con un array vacío de preguntas.
2. La actualización de configuración usa `upsert` (crear o actualizar).
3. Solo usuarios autenticados pueden modificar la configuración.

---

# 10. Servicios

> **Nota:** El directorio `src/services/` está vacío. No existe una capa de servicios separada. Toda la lógica de negocio reside actualmente en los controladores.

Los "servicios" lógicos del sistema (no archivos de código) son:

| Servicio Lógico | Implementado en | Responsabilidad |
|---|---|---|
| Servicio de Autenticación | `authController.js` | Registro de usuarios, login, generación de JWT |
| Servicio de Empleados | `empleadoController.js` | CRUD completo de técnicos |
| Servicio de Clientes | `clienteController.js` | Registro de clientes |
| Servicio de Servicios | `servicioController.js` | Registro y consulta de servicios de mantenimiento |
| Servicio de Feedback | `feedbackController.js` | Gestión de encuestas públicas, recepción de respuestas |
| Servicio de Configuración | `configuracionController.js` | Gestión de preguntas dinámicas ISO 9001 |
| Servicio de Dashboard | `dashboardController.js` | Cálculo de KPIs y métricas gerenciales |
| Servicio de Base de Datos | `config/supabaseClient.js` | Conexión singleton a Supabase/PostgreSQL |
| Servicio de Autorización | `middlewares/authMiddleware.js` | Verificación de JWT en rutas protegidas |

---

# 11. Integraciones

## 11.1 APIs Externas Actuales

| Servicio | Propósito | Configuración |
|---|---|---|
| **Supabase** | Base de datos PostgreSQL como servicio (BaaS) | URL y clave API en variables de entorno `SUPABASE_URL` y `SUPABASE_KEY` |

### Detalles de la Integración con Supabase

- **Tipo de acceso:** Clave `service_role` (acceso total, bypasea RLS).
- **Operaciones utilizadas del cliente:**
  - `.from('tabla').select()` — Consultas con filtros, JOINs, conteos.
  - `.from('tabla').insert()` — Inserciones de registros.
  - `.from('tabla').update()` — Actualizaciones de registros.
  - `.from('tabla').delete()` — Eliminación de registros.
  - `.from('tabla').upsert()` — Insert o update condicional.
  - `.single()` — Espera exactamente un resultado.
  - `.eq()` — Filtro de igualdad.
  - `.order()` — Ordenamiento.
  - `{ count: 'exact', head: true }` — Conteo sin datos.

## 11.2 Integraciones Futuras Planeadas

| Servicio | Propósito | Estado |
|---|---|---|
| **n8n** | Automatización de envío de encuestas por WhatsApp/email tras crear un servicio | ⏳ Pendiente |
| **WhatsApp API** | Envío de enlaces de encuesta a clientes | ⏳ Pendiente |
| **Email/SMTP** | Envío de notificaciones por correo | ⏳ Pendiente |

## 11.3 Webhooks

No hay webhooks implementados actualmente. La integración con n8n planea usar webhooks para disparar automatizaciones.

---

# 12. Problemas Resueltos

## 12.1 Dos Entry Points Conflictivos

**Problema:** El proyecto tenía dos archivos que iniciaban el servidor (`index.js` y `src/server.js`). Al ejecutar `npm run dev` (que usaba `src/server.js`), las rutas de la API no estaban disponibles porque `server.js` no importaba `app.js`.

**Solución:** Se unificó para que ambos entry points importen `src/app.js`. El entry point principal es `index.js` (usado por `npm start`). `src/server.js` se actualizó para también importar `src/app.js`.

## 12.2 Campo `nombre` vs `company_name` en Dashboard

**Problema:** El controlador del dashboard intentaba leer `clientes.nombre` que no existía en la tabla. La tabla `clientes` usa `company_name`.

**Solución:** Se corrigió el SELECT del JOIN en `dashboardController.js` para usar `clientes(company_name)` y se actualizó el mapeo: `f.servicios?.clientes?.company_name || 'Cliente Anónimo'`.

## 12.3 Duplicate Feedback Prevention

**Problema:** Los clientes podían enviar la misma encuesta múltiples veces, generando datos de satisfacción duplicados.

**Solución implementada en dos niveles:**
1. **Nivel de base de datos:** Restricción UNIQUE en `feedback_clientes.token_usado`.
2. **Nivel de controlador:** Verificación previa consultando si ya existe un registro con ese token antes de insertar. Si existe → 409 Conflict.

## 12.4 Eliminación de Empleados con Servicios

**Problema:** Al eliminar un empleado que tenía servicios asociados, se violaba la restricción de foreign key.

**Solución:** Se agregó una verificación previa en `eliminarEmpleado` que cuenta los servicios asociados al técnico. Si tiene servicios → 400 con mensaje descriptivo.

## 12.5 Auto-creación de Configuración de Encuestas

**Problema:** Al consultar la configuración de encuestas por primera vez, si el registro no existía en la tabla, se retornaba un error 404, impidiendo que el panel admin cargara correctamente.

**Solución:** Se implementó lógica de auto-creación en `configuracionController.obtenerConfiguracion`: si el registro `ISO9001` no existe, se crea automáticamente con `preguntas: []` usando upsert. El endpoint nunca retorna 404.

## 12.6 Archivo `db.js` Legacy

**Problema:** Existía un archivo `db.js` en la raíz que creaba un cliente Supabase, causando confusión sobre cuál era el archivo correcto de configuración.

**Solución:** Se dejó el archivo pero se documentó que los controladores usan exclusivamente `src/config/supabaseClient.js`. `db.js` es legacy y puede eliminarse.

---

# 13. Convenciones del Proyecto

## 13.1 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de controladores | `camelCase` + sufijo `Controller` | `authController.js`, `empleadoController.js` |
| Archivos de rutas | `camelCase` + sufijo `Routes` | `authRoutes.js`, `empleadoRoutes.js` |
| Archivos de middleware | `camelCase` + sufijo `Middleware` | `authMiddleware.js` |
| Funciones de controlador | `camelCase` en español | `registrarUsuario`, `obtenerEmpleados`, `crearServicio` |
| Variables | `camelCase` | `contraseñaValida`, `feedbackData` |
| Constantes | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `PORT` |
| Tablas de BD | `snake_case` en español | `feedback_clientes`, `configuracion_encuestas` |
| Campos de BD | `snake_case` | `contact_name`, `tecnico_id`, `password_hash` |
| Prefijo de API | `/api/` + recurso en español | `/api/empleados`, `/api/servicios`, `/api/encuesta` |

## 13.2 Idioma

- **Código (variables, funciones):** Español predominante con mezcla de inglés.
- **Campos de base de datos:** Mezcla de español e inglés (ej: `nombre` vs `contact_name`).
- **Respuestas JSON:** Inconsistente — algunos usan `éxito`/`mensaje`/`datos` (español con acentos), otros usan `success`/`message`/`data` (inglés).
- **Comentarios:** Español.
- **Nombres de tabla:** Español.

## 13.3 Estructura de un Controlador

Cada función de controlador sigue este patrón:

```javascript
const funcion = async (req, res) => {
  // 1. Extraer datos del request (body, params, query)
  const { campo1, campo2 } = req.body;

  // 2. Validaciones (opcional)
  if (!campo1) {
    return res.status(400).json({ éxito: false, mensaje: '...' });
  }

  try {
    // 3. Operación con Supabase
    const { data, error } = await supabase.from('tabla').select('*');

    // 4. Verificar error de Supabase
    if (error) throw new Error(error.message);

    // 5. Respuesta exitosa
    res.status(200).json({ éxito: true, datos: data });
  } catch (error) {
    // 6. Respuesta de error
    res.status(500).json({ éxito: false, error: error.message });
  }
};
```

## 13.4 Estructura de un Archivo de Rutas

```javascript
const express = require('express');
const router = express.Router();
const controlador = require('../controllers/controladorX');
const verificarToken = require('../middlewares/authMiddleware');

router.get('/', verificarToken, controlador.funcion);
router.post('/', verificarToken, controlador.otraFuncion);

module.exports = router;
```

## 13.5 Buenas Prácticas Utilizadas

1. **Try/catch en toda función async:** Todas las funciones de controlador están envueltas en try/catch.
2. **Separación de rutas y controladores:** Las rutas solo definen paths y asignan controladores. No contienen lógica.
3. **Singleton del cliente DB:** Una sola instancia de Supabase compartida por todos los módulos.
4. **Variables de entorno:** Credenciales y configuración en `.env`, no en el código.
5. **Gitignore configurado:** `node_modules/`, `.env` y archivos del sistema excluidos del versionamiento.
6. **Respuestas HTTP semánticas:** Uso de códigos 200, 201, 400, 401, 403, 404, 409, 500 según el caso.
7. **Validación de campos obligatorios** antes de interactuar con la base de datos.
8. **Protección de integridad referencial** (verificar dependencias antes de eliminar).
9. **Prevención de duplicados** tanto a nivel de controlador como de base de datos.
10. **Health check endpoint** para verificar que el servidor está operativo.

---

# 14. Estado Actual

## 14.1 Qué Funciona ✅

- [x] Servidor Express inicia correctamente en el puerto 3000.
- [x] CORS configurado para el frontend Angular.
- [x] Health check endpoint (`GET /api/health`).
- [x] Registro de usuarios con contraseña hasheada.
- [x] Login con generación de JWT (8h de expiración).
- [x] Middleware de autenticación JWT funcional.
- [x] CRUD completo de empleados (con protección contra eliminación con servicios).
- [x] Registro y listado de servicios (con JOIN de técnico).
- [x] Registro de clientes (protegido por JWT).
- [x] Encuestas públicas: obtener preguntas por token, enviar respuestas.
- [x] Prevención de respuestas duplicadas de encuestas (doble verificación).
- [x] Configuración dinámica de preguntas (admin, con auto-creación).
- [x] Dashboard de KPIs con cálculo de promedio, conteos y últimos comentarios.
- [x] Variables de entorno separadas del código.

## 14.2 Qué Está Incompleto ⚠️

- [ ] **CRUD de clientes:** Solo tiene creación (POST). Faltan GET (listar), PUT (actualizar), DELETE (eliminar).
- [ ] **Verificación de roles:** `role_id` existe en el JWT pero no se usa para restringir acceso. Cualquier usuario autenticado puede hacer cualquier operación.
- [ ] **Inconsistencia en formato de respuestas:** Mezcla de español (`éxito`/`mensaje`) e inglés (`success`/`message`).
- [ ] **Validaciones en registro de clientes:** No hay validación de campos obligatorios.
- [ ] **Actualización de empleados:** No valida campos obligatorios (permite enviar campos vacíos).
- [ ] **Script `npm run dev`:** `src/server.js` fue actualizado pero funcionalmente duplica a `index.js`.
- [ ] **Librería `bcrypt` sin usar:** Instalada pero no importada. Solo se usa `bcryptjs`.
- [ ] **Librería `pg` sin usar:** Instalada pero no importada directamente.
- [ ] **devDependencies de frontend:** `tailwindcss`, `postcss`, `autoprefixer` no pertenecen al backend.
- [ ] **Logs de diagnóstico en producción:** `configuracionController.js` tiene `console.log` de diagnóstico que deberían eliminarse o reemplazarse por un logger formal.

## 14.3 Qué Falta Desarrollar ❌

- [ ] Sistema de roles y permisos (middleware `verificarRol`).
- [ ] CRUD completo de clientes (listar, actualizar, eliminar).
- [ ] Integración con n8n para automatización de envío de encuestas.
- [ ] Envío de encuestas por WhatsApp/SMS.
- [ ] Envío de notificaciones por email.
- [ ] Rate limiting y protección contra fuerza bruta.
- [ ] Refresh tokens para renovar JWT sin re-login.
- [ ] Paginación en endpoints de listado.
- [ ] Búsqueda y filtrado en endpoints de listado.
- [ ] Logs estructurados (Winston, Pino o similar).
- [ ] Tests unitarios y de integración.
- [ ] Documentación interactiva de la API (Swagger/OpenAPI).
- [ ] Validación de tipos de datos con librería (Joi, Zod).
- [ ] Manejo centralizado de errores (error handler middleware).
- [ ] Caché de configuración de encuestas.
- [ ] Reportes exportables (PDF/Excel) de satisfacción.
- [ ] Endpoint para cambiar contraseña.
- [ ] Endpoint para recuperar contraseña.
- [ ] Auditoría de acciones (quién hizo qué y cuándo).

---

# 15. Próximos Pasos (Lista Priorizada)

## Prioridad Alta 🔴

1. **Unificar formato de respuestas JSON** — Decidir entre español (`éxito`/`mensaje`/`datos`) e inglés (`success`/`message`/`data`) y aplicarlo en todos los controladores.
2. **Implementar verificación de roles** — Crear middleware `verificarRol(rolesPermitidos)` que valide `req.usuario.role_id` contra una lista de roles autorizados.
3. **Proteger endpoint de registro** — `POST /api/auth/registro` está abierto. Debe protegerse con JWT + verificación de rol administrador, o deshabilitarse en producción.
4. **Completar CRUD de clientes** — Agregar endpoints GET, PUT, DELETE para la tabla `clientes`.
5. **Agregar validaciones de datos** — Implementar validación con Joi o Zod en todos los endpoints que reciben body.

## Prioridad Media 🟡

6. **Integración con n8n** — Configurar webhooks para que al crear un servicio, se dispare automáticamente el envío de la encuesta al cliente.
7. **Rate limiting** — Implementar `express-rate-limit` especialmente en `/api/auth/login`.
8. **Paginación** — Agregar paginación a endpoints de listado (empleados, servicios, feedback).
9. **Limpiar dependencias** — Eliminar `bcrypt`, `pg`, `tailwindcss`, `postcss`, `autoprefixer` del `package.json`.
10. **Eliminar archivo `db.js` legacy** — Ya no es necesario.
11. **Logger formal** — Reemplazar `console.log`/`console.error` con Winston o Pino.

## Prioridad Baja 🟢

12. **Tests** — Escribir tests unitarios para controladores y tests de integración para endpoints.
13. **Swagger/OpenAPI** — Generar documentación interactiva de la API.
14. **Helmet** — Agregar middleware de seguridad HTTP.
15. **Refresh tokens** — Implementar renovación de JWT.
16. **Reportes** — Exportación de métricas en PDF/Excel.
17. **Auditoría** — Log de acciones de usuario.
18. **Recuperación de contraseña** — Flujo de "olvidé mi contraseña" con email.
19. **Manejo centralizado de errores** — Crear un error handler middleware global.

---

# Apéndice A: Variables de Entorno Requeridas

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `3000` | Puerto en el que escucha el servidor HTTP |
| `SUPABASE_URL` | **Sí** | — | URL del proyecto Supabase |
| `SUPABASE_KEY` | **Sí** | — | Clave API de Supabase (service_role) |
| `JWT_SECRET` | Recomendada | `'super_secreto_portal_360_2026'` | Clave secreta para firmar tokens JWT |
| `FRONTEND_URL` | No | `'http://localhost:4200'` | URL del frontend permitida por CORS |

---

# Apéndice B: Scripts de npm

| Script | Comando | Descripción |
|---|---|---|
| `npm start` | `node index.js` | Inicia el servidor de producción con todas las rutas de la API |
| `npm run dev` | `node src/server.js` | Inicia el servidor de desarrollo (importa `src/app.js`) |
| `npm test` | `echo "Error: no test specified"` | Placeholder. No hay tests implementados |

---

# Apéndice C: Catálogo Completo de Endpoints

| # | Método | Ruta Completa | Auth | Controlador | Función |
|---|---|---|---|---|---|
| 1 | GET | `/api/health` | ❌ | inline (`app.js`) | Health check |
| 2 | POST | `/api/auth/registro` | ❌ | `authController` | `registrarUsuario` |
| 3 | POST | `/api/auth/login` | ❌ | `authController` | `loginUsuario` |
| 4 | POST | `/api/clientes` | ✅ | `clienteController` | `registrarCliente` |
| 5 | GET | `/api/empleados` | ✅ | `empleadoController` | `obtenerEmpleados` |
| 6 | POST | `/api/empleados` | ✅ | `empleadoController` | `crearEmpleado` |
| 7 | PUT | `/api/empleados/:id` | ✅ | `empleadoController` | `actualizarEmpleado` |
| 8 | DELETE | `/api/empleados/:id` | ✅ | `empleadoController` | `eliminarEmpleado` |
| 9 | GET | `/api/servicios` | ✅ | `servicioController` | `obtenerServicios` |
| 10 | POST | `/api/servicios` | ✅ | `servicioController` | `crearServicio` |
| 11 | GET | `/api/encuesta/config/:tipo` | ❌ | `feedbackController` | `obtenerConfiguracion` |
| 12 | POST | `/api/encuesta/responder` | ❌ | `feedbackController` | `guardarRespuesta` |
| 13 | PUT | `/api/encuesta/config/:tipo` | ✅ | `feedbackController` | `actualizarConfiguracion` |
| 14 | GET | `/api/encuesta/:token` | ❌ | `feedbackController` | `obtenerEncuesta` |
| 15 | POST | `/api/encuesta/:token` | ❌ | `feedbackController` | `enviarEncuesta` |
| 16 | GET | `/api/configuracion` | ✅ | `configuracionController` | `obtenerConfiguracion` |
| 17 | PUT | `/api/configuracion` | ✅ | `configuracionController` | `actualizarConfiguracion` |
| 18 | GET | `/api/dashboard/kpis` | ✅ | `dashboardController` | `obtenerKPIs` |

**Total: 18 endpoints** (7 públicos, 11 protegidos).

---

> **Documento generado como base de conocimiento reutilizable.** Cualquier IA o desarrollador puede usar este archivo para comprender la totalidad del backend sin necesidad de leer el código fuente. Actualizar este documento cada vez que se realicen cambios significativos en la arquitectura, endpoints o reglas de negocio.
