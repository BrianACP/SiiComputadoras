const express = require('express');
const router = express.Router();
const { obtenerEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado } = require('../controllers/empleadoController');

// Importamos el middleware de seguridad (el guardia)
const verificarToken = require('../middlewares/authMiddleware');

// GET /api/empleados - Solo el gerente logueado puede ver la lista de empleados
router.get('/', verificarToken, obtenerEmpleados);

// POST /api/empleados - Solo el gerente logueado puede registrar un nuevo empleado
router.post('/', verificarToken, crearEmpleado);

// PUT /api/empleados/:id - Solo el gerente logueado puede actualizar un empleado
router.put('/:id', verificarToken, actualizarEmpleado);

// DELETE /api/empleados/:id - Solo el gerente logueado puede eliminar un empleado
router.delete('/:id', verificarToken, eliminarEmpleado);

module.exports = router;
