const supabase = require('../config/supabaseClient');

const obtenerConfiguracion = async (req, res) => {
    const { tipo } = req.params;
    try {
        const { data, error } = await supabase
            .from('configuracion_encuestas')
            .select('preguntas')
            .eq('id', tipo.toUpperCase())
            .single();

        if (error || !data) {
            return res.status(404).json({ exito: false, mensaje: 'Configuración no encontrada' });
        }
        res.status(200).json({ exito: true, preguntas: data.preguntas });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error del servidor', error: error.message });
    }
};

const guardarRespuesta = async (req, res) => {
    const { token_servicio, respuestas } = req.body;
    try {
        const { data: servicio, error: errorServicio } = await supabase
            .from('servicios')
            .select('id')
            .eq('token', token_servicio)
            .single();

        if (errorServicio || !servicio) {
            return res.status(400).json({ exito: false, mensaje: 'Enlace de encuesta inválido o expirado' });
        }

        const { data: feedback, error: errorFeedback } = await supabase
            .from('feedback_clientes')
            .insert([{ servicio_id: servicio.id, respuestas: respuestas }]);

        if (errorFeedback) {
            if (errorFeedback.code === '23505') {
                return res.status(400).json({ exito: false, mensaje: 'Ya hemos recibido una respuesta. ¡Gracias!' });
            }
            throw errorFeedback;
        }

        // --- ACTUALIZAR ESTATUS DEL SERVICIO A "completado" ---
        const { error: errorEstatus } = await supabase
            .from('servicios')
            .update({ estatus: 'completado' })
            .eq('id', servicio.id);

        if (errorEstatus) {
            console.error('Error al actualizar estatus del servicio:', errorEstatus);
        }

        res.status(201).json({ exito: true, mensaje: '¡Encuesta guardada con éxito!' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error interno al procesar', error: error.message });
    }
};

const actualizarConfiguracion = async (req, res) => {
    const { tipo } = req.params;
    const { preguntas } = req.body;
    const id = tipo.toUpperCase();

    try {
        const { data, error } = await supabase
            .from('configuracion_encuestas')
            .upsert(
                { id, preguntas, updated_at: new Date().toISOString() },
                { onConflict: 'id' }
            )
            .select();

        if (error) {
            console.error('Error Supabase al guardar configuración:', error);
            return res.status(500).json({
                exito: false,
                mensaje: 'Error al actualizar configuración',
                error: error.message,
            });
        }

        const registro = data?.[0];
        return res.status(200).json({
            exito: true,
            mensaje: '¡Preguntas actualizadas con éxito!',
            preguntas: registro?.preguntas ?? preguntas,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            exito: false,
            mensaje: 'Error al actualizar configuración',
            error: error.message,
        });
    }
};

const obtenerEncuesta = async (req, res) => {
  const { token } = req.params;

  try {
    const { data: servicio, error: errorServicio } = await supabase
      .from('servicios')
      .select('id, folio, cliente, tecnico_id')
      .eq('token', token)
      .single();

    if (errorServicio || !servicio) {
      return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
    }

    const { data: feedbackExistente, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('id')
      .eq('token_usado', token)
      .single();

    if (feedbackExistente) {
      return res.status(409).json({ success: false, message: 'Esta encuesta ya fue respondida' });
    }

    const { data: config, error: errorConfig } = await supabase
      .from('configuracion_encuestas')
      .select('preguntas')
      .eq('id', 'ISO9001')
      .single();

    if (errorConfig || !config) {
      return res.status(500).json({ success: false, message: 'Error al cargar encuesta' });
    }

    res.status(200).json({
      success: true,
      data: {
        folio: servicio.folio,
        cliente: servicio.cliente,
        tecnico_id: servicio.tecnico_id,
        preguntas: config.preguntas
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor', error: error.message });
  }
};

const enviarEncuesta = async (req, res) => {
  const { token } = req.params;
  const { respuestas } = req.body;

  try {
    const { data: servicio, error: errorServicio } = await supabase
      .from('servicios')
      .select('id')
      .eq('token', token)
      .single();

    if (errorServicio || !servicio) {
      return res.status(404).json({ success: false, message: 'Encuesta no encontrada' });
    }

    const { data: feedbackExistente, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('id')
      .eq('token_usado', token)
      .single();

    if (feedbackExistente) {
      return res.status(409).json({ success: false, message: 'Esta encuesta ya fue respondida' });
    }

    if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ success: false, message: 'Respuestas invalidas o incompletas' });
    }

    // Calcular promedio para activar alerta
    const calificaciones = respuestas
      .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
      .map(r => r.calificacion);
    
    const promedio = calificaciones.length > 0
      ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
      : null;
    
    const alerta_activa = promedio !== null && promedio <= 2;

    const { data: insertado, error: errorInsert } = await supabase
      .from('feedback_clientes')
      .insert([{
        servicio_id: servicio.id,
        token_usado: token,
        respuestas: respuestas,
        respondido_at: new Date().toISOString(),
        alerta_activa: alerta_activa
      }])
      .select();

    if (errorInsert) {
      return res.status(500).json({ success: false, message: 'Error al registrar encuesta' });
    }

    // --- ACTUALIZAR ESTATUS DEL SERVICIO A "completado" ---
    const { error: errorEstatus } = await supabase
      .from('servicios')
      .update({ estatus: 'completado' })
      .eq('id', servicio.id);

    if (errorEstatus) {
      console.error('Error al actualizar estatus del servicio:', errorEstatus);
      // El feedback ya se guardó, así que respondemos éxito pero con advertencia
    }

    res.status(201).json({ success: true, message: 'Encuesta registrada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor', error: error.message });
  }
};

module.exports = { obtenerConfiguracion, guardarRespuesta, actualizarConfiguracion, obtenerEncuesta, enviarEncuesta };