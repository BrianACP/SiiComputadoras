require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Portal 360 corriendo en http://localhost:${PORT}`);
  console.log(`Verifica el estado en http://localhost:${PORT}/api/health`);
});
