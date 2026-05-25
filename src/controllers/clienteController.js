const supabase = require('../config/supabaseClient');

// --- REGISTRAR UN NUEVO CLIENTE ---
const registrarCliente = async (req, res) => {
  // Extraemos los datos usando los nombres EXACTOS de tu base de datos
  const { contact_name, company_name, phone_number, email } = req.body;

  try {
    // Insertamos los datos en la tabla 'clientes'
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ contact_name, company_name, phone_number, email }])
      .select();
      
    if (error) throw new Error(error.message);

    res.status(201).json({ 
      éxito: true, 
      mensaje: 'Cliente registrado exitosamente', 
      datos: data 
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

module.exports = { registrarCliente }; 