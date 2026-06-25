const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const { obtenerConfiguracion, actualizarConfiguracion } = require('../controllers/configuracionController');

// GET /api/configuracion — obtener configuracion de preguntas ISO9001
router.get('/', verificarToken, obtenerConfiguracion);
router.get('/', authMiddleware, obtenerConfiguracion);

// PUT /api/configuracion — actualizar configuracion de preguntas ISO9001
router.put('/', verificarToken, actualizarConfiguracion);
router.put('/', authMiddleware, actualizarConfiguracion);

module.exports = router;
