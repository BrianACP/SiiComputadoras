const express = require('express');
const router = express.Router();
const {
  generarRonda,
  obtenerKpisClima,
  obtenerTendenciaClima,
  obtenerPorPuesto,
  obtenerConfigs,
  obtenerConfigPorId,
  actualizarConfig,
  crearConfig
} = require('../controllers/climaLaboralController');

// Importamos el middleware de seguridad (el guardia)
const verificarToken = require('../middlewares/authMiddleware');

// POST /api/clima-laboral/generar-ronda - Solo el gerente logueado puede generar una ronda
router.post('/generar-ronda', verificarToken, generarRonda);

// GET /api/clima-laboral/kpis - Solo el gerente logueado puede ver los KPIs
router.get('/kpis', verificarToken, obtenerKpisClima);

// GET /api/clima-laboral/tendencia - Solo el gerente logueado puede ver la tendencia
router.get('/tendencia', verificarToken, obtenerTendenciaClima);

// GET /api/clima-laboral/por-puesto - Solo el gerente logueado puede ver metricas por puesto
router.get('/por-puesto', verificarToken, obtenerPorPuesto);

// GET /api/clima-laboral/configs - Lista las configuraciones de encuesta por empleado/puesto
router.get('/configs', verificarToken, obtenerConfigs);

// GET /api/clima-laboral/configs/:configId - Obtiene una configuracion puntual
router.get('/configs/:configId', verificarToken, obtenerConfigPorId);

// PUT /api/clima-laboral/configs/:configId - Actualiza una configuracion existente
router.put('/configs/:configId', verificarToken, actualizarConfig);

// POST /api/clima-laboral/configs - Crea una configuracion nueva para un puesto
router.post('/configs', verificarToken, crearConfig);

module.exports = router;
