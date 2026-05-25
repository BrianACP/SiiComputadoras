const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para registrar un nuevo usuario interno
router.post('/registro', authController.registrarUsuario);

// Ruta para iniciar sesión
router.post('/login', authController.loginUsuario);

module.exports = router;
