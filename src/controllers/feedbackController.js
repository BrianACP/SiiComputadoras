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

module.exports = { obtenerConfiguracion, guardarRespuesta, actualizarConfiguracion };