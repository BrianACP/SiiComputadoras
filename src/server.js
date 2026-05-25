require('dotenv').config(); // Carga las variables de entorno
const app = require('./app');

// Usa el puerto del archivo .env o el 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Portal 360 corriendo en http://localhost:${PORT}`);
  console.log(`Verifica el estado en http://localhost:${PORT}/api/health`);
});