const express = require('express');
const router = express.Router();
const {
  obtenerEncuestaPorToken,
  responderEncuestaPorToken
} = require('../controllers/encuestaEmpleadoController');

// GET /api/encuesta-empleado/:token - publica, sin autenticacion
router.get('/:token', obtenerEncuestaPorToken);

// POST /api/encuesta-empleado/:token - publica, sin autenticacion
router.post('/:token', responderEncuestaPorToken);

module.exports = router;
