const express = require('express');
const router = express.Router();
const { obtenerServicios, crearServicio } = require('../controllers/servicioController');

// Importamos el middleware de seguridad (el guardia)
const verificarToken = require('../middlewares/authMiddleware');

// GET /api/servicios - Solo el gerente logueado puede ver los servicios registrados
router.get('/', verificarToken, obtenerServicios);

// POST /api/servicios - Solo el gerente logueado puede registrar un nuevo servicio/mantenimiento
router.post('/', verificarToken, crearServicio);

module.exports = router;
