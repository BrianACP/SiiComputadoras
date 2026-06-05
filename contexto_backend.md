# Contexto del Backend: API REST - Portal de Evaluación 360

Este documento sirve como la "Base de Conocimiento" principal para el desarrollo del backend. Define las reglas, la arquitectura de la API y el estado actual del servidor. Debe ser utilizado por cualquier Inteligencia Artificial o desarrollador para asegurar que las futuras implementaciones mantengan la seguridad, consistencia y estructura definida del proyecto.

## 1. Resumen del Proyecto (Backend)
- **Nombre:** API REST - Portal de Evaluación 360 (Apoyo a Certificación ISO 9001).
- **Objetivo:** Servir como el motor central que gestiona la base de datos de empleados y servicios, y procesar las encuestas de satisfacción. Actúa como puente seguro y eficiente entre la base de datos (Supabase), la aplicación cliente (Angular) y las automatizaciones futuras (n8n).

## 2. Stack Tecnológico
- **Entorno:** Node.js.
- **Framework:** Express.js.
- **Base de Datos:** Supabase (PostgreSQL) usando su cliente oficial.
- **Seguridad:** JSON Web Tokens (JWT) para proteger las rutas administrativas.

## 3. Arquitectura y Estructura de Carpetas
El proyecto sigue un patrón MVC (Modelo-Vista-Controlador) simplificado, enfocado en Rutas y Controladores:

- `src/controllers/`: Contiene toda la lógica de negocio y las llamadas a la base de datos (Supabase).
- `src/routes/`: Define los endpoints de la API y asigna los middlewares y controladores correspondientes.
- `src/middlewares/`: Contiene la lógica de validación, interceptores de peticiones y seguridad (ej. verificación de JWT).

## 4. Estado Actual de la API (Endpoints Construidos)

> **Nota de Seguridad:** Todas las siguientes rutas administrativas requieren el token JWT en las cabeceras de la petición (`Authorization: Bearer <token>`).

### Empleados (CRUD Completo)
- `GET /api/empleados`: Obtiene la lista de todos los empleados.
- `POST /api/empleados`: Registra un nuevo empleado.
- `PUT /api/empleados/:id`: Actualiza la información de un empleado existente.
- `DELETE /api/empleados/:id`: Elimina un empleado del sistema.

### Servicios
- `GET /api/servicios`: Obtiene la lista de servicios. Incluye un JOIN para traer el nombre del técnico asociado.
- `POST /api/servicios`: Crea un nuevo servicio (Autogenera un token único en la base de datos para la encuesta).

## 5. Estructura de la Base de Datos (Supabase)

### Tabla `empleados`
- `id` (UUID, Primary Key)
- `nombre` (Text)
- `puesto` (Text)
- `telefono` (Text)
- `created_at` (Timestamp)

### Tabla `servicios`
- `id` (UUID, Primary Key)
- `folio` (Text)
- `cliente` (Text)
- `telefono_cliente` (Text)
- `descripcion_servicio` (Text)
- `tecnico_id` (UUID, Foreign Key referenciando a `empleados.id`)
- `estatus` (Text)
- `token` (Text, Único - Usado para validar encuestas)
- `created_at` (Timestamp)

## 6. Próximos Pasos Inmediatos
- **Módulo de Feedback:** Creación del controlador y rutas para `feedback_clientes`.
- **Endpoint Público para Encuestas:** Desarrollar un endpoint público (sin requerir JWT) para validar el token proveniente de la URL, recibir las respuestas de la encuesta de satisfacción y marcar el token del servicio como utilizado para prevenir envíos duplicados.

## 7. Reglas Estrictas de Desarrollo (¡Crítico para la IA!)

Para mantener la integridad y calidad del código, se deben seguir estrictamente las siguientes reglas en cada nueva implementación:

- **Manejo de Errores:** Toda función asíncrona dentro de los controladores **debe** estar envuelta en bloques `try/catch`. Nunca se deben dejar promesas sin manejar.
- **Respuestas HTTP:** Retornar siempre códigos de estado HTTP precisos y semánticos:
  - `200 OK` para éxito en consultas o actualizaciones.
  - `201 Created` para la creación exitosa de registros.
  - `400 Bad Request` para datos faltantes o inválidos en la petición.
  - `404 Not Found` cuando un recurso solicitado no existe.
  - `500 Internal Server Error` para errores de base de datos o excepciones no controladas del servidor.
- **Formato de Respuesta:** Mantener un formato JSON predecible y estandarizado al devolver datos o mensajes de error al frontend. (ej. `{ "success": true, "data": ... }` o `{ "success": false, "message": "..." }`).
- **Separación de Responsabilidades:** **Nunca** mezclar la lógica de interacción con la base de datos dentro de los archivos de rutas. Las rutas solo deben delegar el flujo a los controladores correspondientes.
