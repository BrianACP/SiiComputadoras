const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { obtenerConfiguracion, actualizarConfiguracion } = require('../controllers/configuracionController');

// GET /api/configuracion — obtener configuracion de preguntas ISO9001
router.get('/', verificarToken, obtenerConfiguracion);

// PUT /api/configuracion — actualizar configuracion de preguntas ISO9001
router.put('/', verificarToken, actualizarConfiguracion);

module.exports = router;
