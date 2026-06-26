const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const verificarToken = require('../middlewares/authMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas de reportes requieren un token valido
router.use(verificarToken);
router.use(authMiddleware);

router.get('/', reportesController.obtenerResumen);
router.get('/por-tecnico', reportesController.obtenerPorTecnico);
router.get('/tendencia', reportesController.obtenerTendencia);
router.get('/distribucion', reportesController.getDistribucion);
router.get('/tecnico/:tecnico_id', reportesController.obtenerDetalleTecnico);
router.get('/alertas', reportesController.obtenerAlertas);
router.put('/alertas/:feedback_id', reportesController.guardarNotaResolucion);

module.exports = router;
