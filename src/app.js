const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes'); 
const feedbackRoutes = require('./routes/feedbackRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de estado
app.get('/api/health', (req, res) => {
  res.status(200).json({ estado: 'ok', mensaje: 'API funcionando correctamente' });
});

// Registrar las rutas de nuestra aplicación
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes); // -- 2. Conectamos la ruta en el prefij<o /api/clientes
app.use('/api/feedback', feedbackRoutes);//
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/servicios', servicioRoutes);

module.exports = app;

