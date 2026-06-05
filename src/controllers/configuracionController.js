const supabase = require('../config/supabaseClient');

// GET /api/configuracion
// Consulta configuracion_encuestas id=ISO9001.
// Si no existe o hay error, hace upsert con preguntas=[] y garantiza que el registro existe.
// Nunca retorna 404.
const obtenerConfiguracion = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracion_encuestas')
      .select('*')
      .eq('id', 'ISO9001')
      .single();

    // Log de diagnostico para verificar respuesta de Supabase
    console.log('[obtenerConfiguracion] data:', data);
    console.log('[obtenerConfiguracion] error:', error);

    if (error || !data) {
      // El registro no existe: crear uno vacio con upsert
      console.log('[obtenerConfiguracion] Registro no encontrado, creando registro vacio...');

      const { error: upsertError } = await supabase
        .from('configuracion_encuestas')
        .upsert(
          { id: 'ISO9001', preguntas: [], updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );

      if (upsertError) {
        console.log('[obtenerConfiguracion] Error en upsert:', upsertError);
        return res.status(500).json({
          success: false,
          message: 'Error al inicializar la configuracion',
          error: upsertError.message
        });
      }

      return res.status(200).json({
        success: true,
        data: { id: 'ISO9001', preguntas: [] }
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.log('[obtenerConfiguracion] Error inesperado:', err);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: err.message
    });
  }
};

// PUT /api/configuracion
// Actualiza (upsert) el arreglo de preguntas en configuracion_encuestas id=ISO9001.
// Esquema de cada pregunta:
//   { id, tipo: 'calificacion'|'opciones'|'texto', texto, config: { min, max, simbolo, opciones } }
const actualizarConfiguracion = async (req, res) => {
  try {
    const { preguntas } = req.body;

    if (!preguntas || !Array.isArray(preguntas)) {
      return res.status(400).json({
        success: false,
        message: 'El campo preguntas es requerido y debe ser un array'
      });
    }

    const { error } = await supabase
      .from('configuracion_encuestas')
      .upsert(
        { id: 'ISO9001', preguntas, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.log('[actualizarConfiguracion] Error en upsert:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar la configuracion',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Configuracion guardada'
    });
  } catch (err) {
    console.log('[actualizarConfiguracion] Error inesperado:', err);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: err.message
    });
  }
};

module.exports = { obtenerConfiguracion, actualizarConfiguracion };
