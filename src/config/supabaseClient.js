const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Nos aseguramos de leer el .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Pequeña validación para evitar dolores de cabeza si se nos olvida el .env
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las credenciales de Supabase. Revisa tu archivo .env');
}

// Creamos la instancia del cliente
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;