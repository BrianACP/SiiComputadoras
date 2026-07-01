const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes'); 
const feedbackRoutes = require('./routes/feedbackRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const encuestaEmpleadoRoutes = require('./routes/encuestaEmpleadoRoutes');
const climaLaboralRoutes = require('./routes/climaLaboralRoutes');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
};
app.use(cors(corsOptions));
app.use(express.json());

// Ruta de estado
app.get('/api/health', (req, res) => {
  res.status(200).json({ estado: 'ok', mensaje: 'API funcionando correctamente' });
});

// Registrar las rutas de nuestra aplicación
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/encuesta', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/encuesta-empleado', encuestaEmpleadoRoutes);
app.use('/api/clima-laboral', climaLaboralRoutes);

module.exports = app;

