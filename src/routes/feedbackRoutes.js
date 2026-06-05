const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/config/:tipo', feedbackController.obtenerConfiguracion);
router.post('/responder', feedbackController.guardarRespuesta);
router.put('/config/:tipo', authMiddleware, feedbackController.actualizarConfiguracion);

router.get('/:token', feedbackController.obtenerEncuesta);
router.post('/:token', feedbackController.enviarEncuesta);

module.exports = router;

