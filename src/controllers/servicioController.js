const supabase = require('../config/supabaseClient');

// --- OBTENER TODOS LOS SERVICIOS (con nombre del técnico) ---
const obtenerServicios = async (req, res) => {
  try {
    // El JOIN se hace con la sintaxis de Supabase: "tecnico_id(nombre)"
    // Esto trae el objeto { nombre } del empleado relacionado en lugar de solo el ID
    const { data, error } = await supabase
      .from('servicios')
      .select(`
        *,
        tecnico_id (
          nombre
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.status(200).json({
      éxito: true,
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- CREAR UN NUEVO SERVICIO (mantenimiento terminado) ---
const crearServicio = async (req, res) => {
  const { folio, cliente, telefono_cliente, descripcion_servicio, tecnico_id } = req.body;

  // Validación: los cinco campos son obligatorios
  if (!folio || !cliente || !telefono_cliente || !descripcion_servicio || !tecnico_id) {
    return res.status(400).json({
      éxito: false,
      mensaje:
        'Faltan datos obligatorios: folio, cliente, telefono_cliente, descripcion_servicio y tecnico_id son requeridos.',
    });
  }

  try {
    // Supabase autogenerará el campo "estatus" (valor por defecto) y el "token" de encuesta
    const { data, error } = await supabase
      .from('servicios')
      .insert([{ folio, cliente, telefono_cliente, descripcion_servicio, tecnico_id }])
      .select();

    if (error) throw new Error(error.message);

    res.status(201).json({
      éxito: true,
      mensaje: 'Servicio registrado exitosamente. La encuesta fue generada.',
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

module.exports = { obtenerServicios, crearServicio };
