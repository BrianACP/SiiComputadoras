const supabase = require('../config/supabaseClient');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const obtenerEncuestaPorToken = async (req, res) => {
  const { token } = req.params;

  if (!UUID_REGEX.test(token)) {
    return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
  }

  try {
    const { data: encuesta, error: errorEncuesta } = await supabase
      .from('feedback_empleados')
      .select('id, token_usado')
      .eq('token', token)
      .maybeSingle();

    if (errorEncuesta) throw errorEncuesta;

    if (!encuesta) {
      return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
    }

    if (encuesta.token_usado === true) {
      return res.status(410).json({ success: false, message: 'Esta encuesta ya fue respondida' });
    }

    const { data: config, error: errorConfig } = await supabase
      .from('configuracion_encuestas')
      .select('preguntas')
      .eq('id', 'empleado')
      .single();

    if (errorConfig || !config) {
      return res.status(500).json({ success: false, message: 'Error al cargar preguntas de la encuesta' });
    }

    res.status(200).json({
      success: true,
      data: {
        preguntas: config.preguntas
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener la encuesta', error: error.message });
  }
};

const responderEncuestaPorToken = async (req, res) => {
  const { token } = req.params;
  const { respuestas } = req.body;

  if (!UUID_REGEX.test(token)) {
    return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
  }

  try {
    const { data: encuesta, error: errorEncuesta } = await supabase
      .from('feedback_empleados')
      .select('id, token_usado')
      .eq('token', token)
      .maybeSingle();

    if (errorEncuesta) throw errorEncuesta;

    if (!encuesta) {
      return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
    }

    if (encuesta.token_usado === true) {
      return res.status(410).json({ success: false, message: 'Esta encuesta ya fue respondida' });
    }

    const { error: errorUpdate } = await supabase
      .from('feedback_empleados')
      .update({
        respuestas,
        token_usado: true,
        respondido_at: new Date().toISOString()
      })
      .eq('id', encuesta.id);

    if (errorUpdate) throw errorUpdate;

    res.status(200).json({ success: true, message: 'Respuesta guardada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar la respuesta', error: error.message });
  }
};

module.exports = { obtenerEncuestaPorToken, responderEncuestaPorToken };
