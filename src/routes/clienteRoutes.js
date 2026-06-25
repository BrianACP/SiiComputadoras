const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Importamos el middleware de seguridad (el guardia)
const verificarToken = require('../middlewares/authMiddleware');
// Importamos el middleware de seguridad
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta para registrar un cliente. Notarás que el candado está activo.
router.post('/', verificarToken, clienteController.registrarCliente);
router.post('/', authMiddleware, clienteController.registrarCliente);

module.exports = router;