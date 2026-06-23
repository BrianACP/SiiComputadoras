const express = require('express');
const router = express.Router();
const { obtenerServicios, crearServicio, obtenerKPIsServicios, actualizarServicio, eliminarServicio } = require('../controllers/servicioController');

// Importamos el middleware de seguridad (el guardia)
const verificarToken = require('../middlewares/authMiddleware');

// GET /api/servicios/kpis - KPIs de servicios agrupados por estatus
router.get('/kpis', verificarToken, obtenerKPIsServicios);

// GET /api/servicios - Solo el gerente logueado puede ver los servicios registrados
router.get('/', verificarToken, obtenerServicios);

// POST /api/servicios - Solo el gerente logueado puede registrar un nuevo servicio/mantenimiento
router.post('/', verificarToken, crearServicio);

// PUT /api/servicios/:id - Actualizar un servicio existente
router.put('/:id', verificarToken, actualizarServicio);

// DELETE /api/servicios/:id - Eliminar un servicio
router.delete('/:id', verificarToken, eliminarServicio);

module.exports = router;
