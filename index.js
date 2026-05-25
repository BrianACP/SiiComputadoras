const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos el cliente de la API de Supabase (ya no es "pool")
const supabase = require('./db'); 

const app = express();

app.use(cors());
app.use(express.json());

// Ruta principal de bienvenida
app.get('/', (req, res) => {
  res.send('¡Servidor de Portal 360 funcionando correctamente!');
});

// NUEVA RUTA: Conexión mediante la API oficial de Supabase
app.get('/test-db', async (req, res) => {
  try {
    // Intentamos pedir 1 solo registro de tu tabla usando peticiones web
    const { data, error } = await supabase
      .from('feedback_empleados')
      .select('*')
      .limit(1);
    
    // Si la API de Supabase nos devuelve un error, lo atrapamos aquí
    if (error) {
      throw error;
    }

    // Si todo sale bien, enviamos los datos al navegador
    res.json({ 
      mensaje: '¡Conexión exitosa a la API de Supabase!', 
      datos_recibidos: data 
    });
    
  } catch (error) {
    console.error('Error de API:', error.message || error);
    res.status(500).json({ 
      error: 'Fallo al conectar con la API de Supabase',
      detalle: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});