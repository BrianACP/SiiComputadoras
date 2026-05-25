const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/config/:tipo', feedbackController.obtenerConfiguracion);
router.post('/responder', feedbackController.guardarRespuesta);
router.put('/config/:tipo', authMiddleware, feedbackController.actualizarConfiguracion);

module.exports = router;
