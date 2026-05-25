const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Si tienes tu middleware de autenticación, descomenta la siguiente línea e impórtalo
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta protegida para obtener los números del gerente
router.get('/kpis', authMiddleware, dashboardController.obtenerKPIs);

module.exports = router;